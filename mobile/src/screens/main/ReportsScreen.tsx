import React, { useContext, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, FlatList, Dimensions, SafeAreaView, Platform } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
    const navigation = useNavigation<any>();
    const { user, selectedAcademicYearId } = useContext(AuthContext);
    const [reports, setReports] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
    const [historyCount, setHistoryCount] = useState(30);

    useFocusEffect(
        useCallback(() => {
            const fetchReports = async () => {
                try {
                    const params = selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {};
                    const response = await api.get('/dashboard/reports', { params });
                    setReports(response.data);
                } catch (e) {
                    console.error('Failed to load reports', e);
                } finally {
                    setLoading(false);
                }
            };
            fetchReports();
        }, [selectedAcademicYearId])
    );

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
                    <View style={{ width: 40 }} />
                </View>
                
                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
                        onPress={() => setActiveTab('overview')}
                    >
                        <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
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
                <View style={styles.card}>
                    {Object.keys(reports.enrollmentGrowth).sort().map((monthStr) => (
                        <View key={monthStr} style={styles.growthRow}>
                            <Text style={styles.growthMonth}>{monthStr}</Text>
                            <View style={styles.barContainer}>
                                <View style={[styles.bar, { width: `${Math.min(100, Math.max(5, (reports.enrollmentGrowth[monthStr] / 20) * 100))}%` }]} />
                                <Text style={styles.growthValue}>+{reports.enrollmentGrowth[monthStr]}</Text>
                            </View>
                        </View>
                    ))}
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
                activeTab === 'overview' ? renderOverview() : renderHistory()
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
