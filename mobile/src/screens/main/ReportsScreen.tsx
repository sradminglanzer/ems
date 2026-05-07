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
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

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
            const today = new Date();
            const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
            const filterLabel = dateFilter === 'all' ? 'All Time' :
                dateFilter === 'this_month' ? 'This Month' :
                dateFilter === 'last_month' ? 'Last Month' :
                dateFilter === '3_months' ? 'Last 3 Months' :
                dateFilter === '6_months' ? 'Last 6 Months' : 'Year to Date';

            const groupHeading = financials.groupLabel || 'Plan-wise Collections';
            const memberLabel = financials.entityType === 'school' ? 'Students' : 'Members';
            const netPositive = financials.summary.netBalance >= 0;

            const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a2e; background: #fff; }

  /* ── HEADER LETTERHEAD ── */
  .letterhead {
    background: linear-gradient(135deg, #1abc9c 0%, #0e6655 100%);
    padding: 36px 40px 28px;
    color: white;
  }
  .letterhead-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; opacity: 0.8; margin-top: 3px; letter-spacing: 1px; text-transform: uppercase; }
  .report-meta { text-align: right; font-size: 12px; opacity: 0.9; line-height: 1.8; }
  .report-title { font-size: 14px; margin-top: 28px; opacity: 0.85; font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase; }
  .report-heading { font-size: 32px; font-weight: 800; margin-top: 4px; }

  /* ── CONTENT WRAPPER ── */
  .content { padding: 32px 40px; }

  /* ── KPI BOXES ── */
  .kpi-row { display: flex; gap: 16px; margin-bottom: 36px; }
  .kpi { flex: 1; background: #f8fafc; border-radius: 12px; padding: 20px; border-left: 4px solid #ccc; }
  .kpi.green { border-left-color: #27ae60; }
  .kpi.red   { border-left-color: #e74c3c; }
  .kpi.blue  { border-left-color: #2980b9; }
  .kpi-label { font-size: 11px; font-weight: 600; color: #888; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 8px; }
  .kpi-value { font-size: 24px; font-weight: 800; }
  .kpi.green .kpi-value { color: #27ae60; }
  .kpi.red   .kpi-value { color: #e74c3c; }
  .kpi.blue  .kpi-value { color: ${netPositive ? '#27ae60' : '#e74c3c'}; }

  /* ── SECTION HEADERS ── */
  .section-title {
    font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: #888; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 16px; margin-top: 32px;
  }

  /* ── TABLES ── */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { background: #1abc9c; color: white; }
  thead th { padding: 12px 14px; text-align: left; font-weight: 600; font-size: 12px; letter-spacing: 0.5px; }
  tbody tr { border-bottom: 1px solid #f0f0f0; }
  tbody tr:hover { background: #fafafa; }
  tbody td { padding: 12px 14px; color: #333; }
  .amount { font-weight: 700; }
  .text-green { color: #27ae60; }
  .text-red   { color: #e74c3c; }
  .text-right { text-align: right; }
  .text-center{ text-align: center; }

  /* ── DIVIDER ── */
  .divider { border: none; border-top: 2px solid #f0f0f0; margin: 32px 0; }

  /* ── FOOTER ── */
  .footer {
    margin-top: 60px; padding: 24px 40px;
    background: #f8fafc; border-top: 1px solid #e8e8e8;
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-brand { font-size: 13px; font-weight: 700; color: #1abc9c; }
  .footer-note  { font-size: 11px; color: #aaa; }
  .footer-page  { font-size: 11px; color: #aaa; }
</style>
</head>
<body>

<!-- LETTERHEAD -->
<div class="letterhead">
  <div class="letterhead-top">
    <div>
      <div class="brand">EMS</div>
      <div class="brand-sub">Enterprise Management System</div>
    </div>
    <div class="report-meta">
      <div><strong>Report Date:</strong> ${dateStr}</div>
      <div><strong>Period:</strong> ${filterLabel}</div>
      <div><strong>Generated By:</strong> Owner</div>
    </div>
  </div>
  <div class="report-title">Financial Statement</div>
  <div class="report-heading">Business Report</div>
</div>

<!-- CONTENT -->
<div class="content">

  <!-- KPI SUMMARY -->
  <div class="section-title">Executive Summary</div>
  <div class="kpi-row">
    <div class="kpi green">
      <div class="kpi-label">Total Collections</div>
      <div class="kpi-value">₹${financials.summary.totalCollected.toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi red">
      <div class="kpi-label">Total Expenses</div>
      <div class="kpi-value">₹${financials.summary.totalExpenses.toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi blue">
      <div class="kpi-label">Net Balance</div>
      <div class="kpi-value">${netPositive ? '+' : '-'}₹${Math.abs(financials.summary.netBalance).toLocaleString('en-IN')}</div>
    </div>
  </div>

  <!-- GROUP-WISE TABLE -->
  <div class="section-title">${groupHeading}</div>
  <table>
    <thead>
      <tr>
        <th>Group / Plan</th>
        <th class="text-center">${memberLabel}</th>
        <th class="text-right">Collected (₹)</th>
        <th class="text-right">Pending (₹)</th>
        <th class="text-right">Collection %</th>
      </tr>
    </thead>
    <tbody>
      ${financials.classWiseData.map((cls: any) => {
          const total = cls.collected + cls.pending;
          const pct = total > 0 ? Math.round((cls.collected / total) * 100) : 0;
          return `<tr>
            <td><strong>${cls.groupName}</strong></td>
            <td class="text-center">${cls.memberCount}</td>
            <td class="text-right amount text-green">₹${cls.collected.toLocaleString('en-IN')}</td>
            <td class="text-right amount text-red">₹${cls.pending.toLocaleString('en-IN')}</td>
            <td class="text-right amount">${pct}%</td>
          </tr>`;
      }).join('')}
    </tbody>
  </table>

  ${financials.expensesByCategory && financials.expensesByCategory.length > 0 ? `
  <!-- EXPENSE BREAKDOWN -->
  <div class="section-title">Expense Breakdown by Category</div>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th class="text-right">Amount (₹)</th>
        <th class="text-right">% of Total Expenses</th>
      </tr>
    </thead>
    <tbody>
      ${financials.expensesByCategory.sort((a: any, b: any) => b.amount - a.amount).map((cat: any) => {
          const pct = financials.summary.totalExpenses > 0 ? Math.round((cat.amount / financials.summary.totalExpenses) * 100) : 0;
          return `<tr>
            <td>${cat.category}</td>
            <td class="text-right amount text-red">₹${cat.amount.toLocaleString('en-IN')}</td>
            <td class="text-right">${pct}%</td>
          </tr>`;
      }).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- DISCLAIMER -->
  <hr class="divider"/>
  <p style="font-size:11px; color:#aaa; line-height:1.8;">
    This report is auto-generated and intended for internal review purposes only.
    All figures are based on data recorded in the EMS system as of the report date.
    Please verify with your accountant before filing.
  </p>
</div>

<!-- FOOTER -->
<div class="footer">
  <div class="footer-brand">EMS — Enterprise Management System</div>
  <div class="footer-note">Confidential — For Internal Use Only</div>
  <div class="footer-page">Generated: ${dateStr}</div>
</div>

</body>
</html>`;

            if (Platform.OS === 'web') {
                // On web: open HTML in a new tab so user can Save as PDF via browser
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                // On native (iOS/Android): generate PDF file and share
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Financial Report' });
                }
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
                    <Text style={styles.sectionTitle}>{financials.groupLabel || 'Plan-wise Collections'}</Text>
                </View>
                {financials.classWiseData && financials.classWiseData.map((cls: any, i: number) => {
                    const total = cls.collected + cls.pending;
                    const collectedPct = total > 0 ? (cls.collected / total) * 100 : 0;
                    const pendingPct = total > 0 ? (cls.pending / total) * 100 : 0;
                    return (
                        <View key={i} style={styles.card}>
                            {/* Top row: class name + member count */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <Text style={styles.shortcutTitle}>{cls.groupName}</Text>
                                <View style={{ backgroundColor: theme.colors.primaryLight + '20', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                                    <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600' }}>{cls.memberCount} {financials.entityType === 'school' ? 'Students' : 'Members'}</Text>
                                </View>
                            </View>

                            {/* Stacked bar */}
                            <View style={{ height: 10, borderRadius: 5, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#F0F0F0', marginBottom: 12 }}>
                                {collectedPct > 0 && (
                                    <View style={{ width: `${collectedPct}%`, backgroundColor: theme.colors.success, borderRadius: 5 }} />
                                )}
                                {pendingPct > 0 && (
                                    <View style={{ width: `${pendingPct}%`, backgroundColor: theme.colors.danger, borderRadius: 5 }} />
                                )}
                            </View>

                            {/* Legend row */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.success }} />
                                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>Collected</Text>
                                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.success }}>₹{cls.collected.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.danger }} />
                                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>Pending</Text>
                                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.danger }}>₹{cls.pending.toLocaleString('en-IN')}</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}

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
