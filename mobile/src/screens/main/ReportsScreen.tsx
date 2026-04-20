import React, { useContext, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, FlatList, Dimensions, SafeAreaView, Platform } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LineChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
    const navigation = useNavigation<any>();
    const { user, selectedAcademicYearId } = useContext(AuthContext);
    const [reports, setReports] = useState<any>(null);
    const [financials, setFinancials] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'history'>('financials');
    const [historyCount, setHistoryCount] = useState(30);
    const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month' | '3_months' | '6_months' | 'ytd'>('all');
    const [tooltipData, setTooltipData] = useState<{ x: number, y: number, value: number, index: number } | null>(null);

    useFocusEffect(
        useCallback(() => {
            const fetchReports = async () => {
                try {
                    setLoading(true);
                    
                    let startDate: string | undefined = undefined;
                    let endDate: string | undefined = undefined;
                    const now = new Date();
                    
                    if (dateFilter === 'this_month') {
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
                    } else if (dateFilter === 'last_month') {
                        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
                        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
                    } else if (dateFilter === '3_months') {
                        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
                        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
                    } else if (dateFilter === '6_months') {
                         startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
                         endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
                    } else if (dateFilter === 'ytd') {
                         startDate = new Date(now.getFullYear(), 0, 1).toISOString();
                         endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();
                    }

                    const params: any = selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {};
                    if (startDate && endDate) {
                        params.startDate = startDate;
                        params.endDate = endDate;
                    }

                    const [res1, res2] = await Promise.all([
                        api.get('/dashboard/reports', { params }),
                        api.get('/dashboard/comprehensive-financials', { params })
                    ]);
                    setReports(res1.data);
                    setFinancials(res2.data);
                } catch (e) {
                    console.error('Failed to load reports', e);
                } finally {
                    setLoading(false);
                }
            };
            fetchReports();
        }, [selectedAcademicYearId, dateFilter])
    );

    const exportToPDF = async () => {
        if (!financials) return;
        
        try {
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
                        h1 { color: #2C3E50; text-align: center; }
                        .summary { display: flex; justify-content: space-between; margin-top: 30px; font-size: 18px; border-bottom: 2px solid #EEE; padding-bottom: 20px;}
                        .val { font-weight: bold; }
                        .positive { color: #27AE60; }
                        .negative { color: #E74C3C; }
                        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                        th, td { border: 1px solid #DDD; padding: 12px; text-align: left; }
                        th { background-color: #F8F9F9; }
                    </style>
                </head>
                <body>
                    <h1>Business Financial Report</h1>
                    <div style="text-align: center; color: #777; margin-bottom: 20px;">
                        Report Filter: ${dateFilter.replace('_', ' ').toUpperCase()}
                    </div>
                    <div class="summary">
                        <div>Total Collections: <span class="val positive">INR ${financials.summary.totalCollected.toLocaleString('en-IN')}</span></div>
                        <div>Total Expenses: <span class="val negative">INR ${financials.summary.totalExpenses.toLocaleString('en-IN')}</span></div>
                        <div>Net Balance: <span class="val ${financials.summary.netBalance >= 0 ? 'positive' : 'negative'}">INR ${financials.summary.netBalance.toLocaleString('en-IN')}</span></div>
                    </div>
                    <h2>Class-wise Collections</h2>
                    <table>
                        <tr><th>Class</th><th>Students</th><th>Collected</th><th>Pending</th></tr>
                        ${financials.classWiseData.map((cls: any) => `
                            <tr>
                                <td>${cls.groupName}</td>
                                <td>${cls.memberCount}</td>
                                <td class="positive">${cls.collected.toLocaleString('en-IN')}</td>
                                <td class="negative">${cls.pending.toLocaleString('en-IN')}</td>
                            </tr>
                        `).join('')}
                    </table>
                    <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #777;">Generated securely by School/Gym EMS</div>
                </body>
                </html>
            `;
            const { uri } = await Print.printToFileAsync({ html });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            }
        } catch (error) {
            console.error("PDF Export failed", error);
        }
    };

    const renderHeader = () => (
        <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
        >
            <SafeAreaView>
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconButton}>
                        <Ionicons name="menu" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Business Reports</Text>
                    <TouchableOpacity onPress={exportToPDF} style={styles.iconButton}>
                        <Ionicons name="document-text" size={20} color={theme.colors.surface} />
                    </TouchableOpacity>
                </View>

                {/* Date Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                    {[
                        { id: 'all', label: 'All Time' },
                        { id: 'this_month', label: 'This Month' },
                        { id: 'last_month', label: 'Last Month' },
                        { id: '3_months', label: '3 Months' },
                        { id: 'ytd', label: 'YTD' }
                    ].map(f => (
                        <TouchableOpacity 
                            key={f.id} 
                            style={[styles.filterPill, dateFilter === f.id && styles.activeFilterPill]}
                            onPress={() => setDateFilter(f.id as any)}
                        >
                            <Text style={[styles.filterText, dateFilter === f.id && styles.activeFilterText]}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                
                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
                        onPress={() => setActiveTab('overview')}
                    >
                        <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'financials' && styles.activeTab]}
                        onPress={() => setActiveTab('financials')}
                    >
                        <Text style={[styles.tabText, activeTab === 'financials' && styles.activeTabText]}>Financials</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                        onPress={() => setActiveTab('history')}
                    >
                        <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Payment History</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );

    const renderOverview = () => {
        if (!reports) return null;
        
        return (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.overviewContainer}>
                
                {/* Revenue Comparison */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Revenue Comparison</Text>
                </View>
                <View style={styles.card}>
                    <View style={styles.rowBetween}>
                        <View>
                            <Text style={styles.cardLabel}>{reports.revenueComparison.currentMonthLabel}</Text>
                            <Text style={styles.cardValue}>₹{(reports.revenueComparison.currentMonth || 0).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end'}}>
                            <Text style={styles.cardLabel}>{reports.revenueComparison.lastMonthLabel}</Text>
                            <Text style={[styles.cardValue, { color: theme.colors.textSecondary, fontSize: 20 }]}>₹{(reports.revenueComparison.lastMonth || 0).toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                </View>

                {/* Enrollment Growth */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Enrollment Growth (6 Months)</Text>
                </View>
                <View style={[styles.card, { padding: 0, paddingRight: 16, overflow: 'visible', zIndex: 10 }]}>
                    <LineChart
                        data={{
                            labels: Object.keys(reports.enrollmentGrowth).sort(),
                            datasets: [{
                                data: Object.keys(reports.enrollmentGrowth).sort().map(k => reports.enrollmentGrowth[k] || 0)
                            }]
                        }}
                        width={width - 48}
                        height={220}
                        yAxisInterval={1}
                        chartConfig={{
                            backgroundColor: theme.colors.surface,
                            backgroundGradientFrom: theme.colors.surface,
                            backgroundGradientTo: theme.colors.surface,
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(18, 140, 126, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            style: { borderRadius: 16 },
                            propsForDots: { r: "5", strokeWidth: "2", stroke: theme.colors.primary }
                        }}
                        bezier
                        style={{ marginVertical: 8, borderRadius: 16 }}
                        onDataPointClick={({ value, x, y, index }) => setTooltipData({ value, x, y, index })}
                    />
                    {tooltipData && (
                        <View style={{
                            position: 'absolute',
                            top: tooltipData.y - 25,
                            left: tooltipData.x - 20,
                            backgroundColor: theme.colors.primary,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 5,
                            zIndex: 100
                        }}>
                            <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
                                +{tooltipData.value}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Shortcuts */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Shortcuts</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}
                    onPress={() => navigation.navigate('Students', { filter: 'pendingFees' })}
                >
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.dangerLight + '30' }]}>
                        <Ionicons name="alert-circle" size={24} color={theme.colors.danger} />
                    </View>
                    <View style={{ marginLeft: 16 }}>
                        <Text style={styles.shortcutTitle}>View Defaulters</Text>
                        <Text style={styles.shortcutDesc}>Members with pending logic</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                <View style={{ height: 40 }}/>
            </ScrollView>
        );
    };

    const renderPaymentItem = ({ item }: { item: any }) => (
        <View style={styles.paymentCard}>
            <View style={styles.rowBetween}>
                <Text style={styles.paymentName}>{item.memberName}</Text>
                <Text style={styles.paymentAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={[styles.rowBetween, { marginTop: 8 }]}>
                <Text style={styles.paymentStructure}>{item.structureName}</Text>
                <Text style={styles.paymentDate}>{new Date(item.paymentDate).toLocaleDateString()}</Text>
            </View>
        </View>
    );

    const renderFinancials = () => {
        if (!financials) return null;
        
        return (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.overviewContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Net Balance Summary</Text>
                </View>
                <View style={[styles.card, { backgroundColor: theme.colors.primary }]}>
                    <Text style={[styles.cardLabel, { color: 'rgba(255,255,255,0.8)' }]}>Total Collections</Text>
                    <Text style={[styles.cardValue, { color: '#fff', fontSize: 24, marginBottom: 12 }]}>₹{(financials.summary.totalCollected || 0).toLocaleString('en-IN')}</Text>
                    
                    <Text style={[styles.cardLabel, { color: 'rgba(255,255,255,0.8)' }]}>Total Expenses</Text>
                    <Text style={[styles.cardValue, { color: '#FFA8A8', fontSize: 24, marginBottom: 12 }]}>-₹{(financials.summary.totalExpenses || 0).toLocaleString('en-IN')}</Text>

                    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 8 }}/>

                    <Text style={[styles.cardLabel, { color: 'rgba(255,255,255,0.8)' }]}>Net Balance</Text>
                    <Text style={[styles.cardValue, { color: financials.summary.netBalance >= 0 ? '#A8FFA8' : '#FFA8A8', fontSize: 32 }]}>
                        {financials.summary.netBalance >= 0 ? '+' : '-'}₹{Math.abs(financials.summary.netBalance || 0).toLocaleString('en-IN')}
                    </Text>
                </View>

                {financials.expensesByCategory && financials.expensesByCategory.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                        </View>
                        <View style={styles.card}>
                            <PieChart
                                data={financials.expensesByCategory.sort((a: any,b: any) => b.amount - a.amount).map((cat: any, i: number) => ({
                                    name: cat.category,
                                    population: cat.amount,
                                    color: [theme.colors.primary, theme.colors.danger, theme.colors.success, '#FFC107', '#9C27B0', '#00BCD4'][i % 6],
                                    legendFontColor: theme.colors.textSecondary,
                                    legendFontSize: 12
                                }))}
                                width={width - 64}
                                height={200}
                                chartConfig={{
                                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                }}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"0"}
                                center={[0, 0]}
                                absolute
                            />
                        </View>
                    </>
                )}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Class-wise Collections</Text>
                </View>
                {financials.classWiseData.map((cls: any, i: number) => (
                    <View key={i} style={styles.card}>
                        <Text style={styles.shortcutTitle}>{cls.groupName}</Text>
                        <Text style={styles.shortcutDesc}>{cls.memberCount} Students</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                            <View>
                                <Text style={styles.paymentStructure}>Collected</Text>
                                <Text style={styles.paymentAmount}>₹{cls.collected.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.paymentStructure}>Pending</Text>
                                <Text style={[styles.paymentAmount, { color: theme.colors.danger }]}>
                                    ₹{cls.pending.toLocaleString('en-IN')}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}

                <View style={{ height: 40 }}/>
            </ScrollView>
        );
    };

    const renderHistory = () => {
        if (!reports || !reports.paymentHistory) return null;

        const displayedHistory = reports.paymentHistory.slice(0, historyCount);

        return (
            <FlatList
                data={displayedHistory}
                keyExtractor={(item) => item._id}
                renderItem={renderPaymentItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                    <View style={{ paddingBottom: 40, paddingTop: 16, alignItems: 'center' }}>
                        {historyCount < reports.paymentHistory.length && (
                            <TouchableOpacity 
                                style={styles.loadMoreBtn} 
                                onPress={() => setHistoryCount(c => c + 30)}
                            >
                                <Text style={styles.loadMoreText}>Load More</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />
        );
    };

    return (
        <View style={styles.container}>
            {renderHeader()}
            
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                activeTab === 'overview' ? renderOverview() : (activeTab === 'financials' ? renderFinancials() : renderHistory())
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 16,
        ...theme.shadows.md,
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.m,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        marginBottom: 16,
    },
    iconButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.surface,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.l,
        gap: theme.spacing.m,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    activeTab: {
        backgroundColor: theme.colors.surface,
    },
    tabText: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    activeTabText: {
        color: theme.colors.primary,
    },
    filterContainer: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: 16,
        gap: 8,
    },
    filterPill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    activeFilterPill: {
        backgroundColor: theme.colors.surface,
    },
    filterText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 13,
        fontWeight: '600',
    },
    activeFilterText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overviewContainer: {
        padding: theme.spacing.m,
    },
    sectionHeader: {
        marginBottom: theme.spacing.s,
        marginTop: theme.spacing.m,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        ...theme.shadows.sm,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    growthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    growthMonth: {
        width: 70,
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    barContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    bar: {
        height: 8,
        backgroundColor: theme.colors.primary,
        borderRadius: 4,
        marginRight: 8,
    },
    growthValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shortcutTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    shortcutDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    listContainer: {
        padding: theme.spacing.m,
    },
    paymentCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        ...theme.shadows.sm,
    },
    paymentName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    paymentAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    paymentStructure: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    paymentDate: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    loadMoreBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        backgroundColor: theme.colors.primaryLight + '30',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    loadMoreText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    }
});
