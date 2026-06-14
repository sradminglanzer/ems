import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Platform, Animated
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../../services/api';
import { theme } from '../../theme';
import { AuthContext } from '../../context/AuthContext';

const GRADE_COLORS: Record<string, string> = {
    'A+': '#27ae60', 'A': '#2ecc71', 'B': '#3498db',
    'C': '#f39c12', 'D': '#e67e22', 'F': '#e74c3c'
};

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function ExamResultsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { exam } = route.params;
    const { user } = useContext(AuthContext);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const scrollY = React.useRef(new Animated.Value(0)).current;

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [Platform.OS === 'ios' ? 180 : 160, Platform.OS === 'ios' ? 100 : 80],
        extrapolate: 'clamp',
    });
    const headerOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: 'clamp' });
    const titleOpacity  = scrollY.interpolate({ inputRange: [40, 80], outputRange: [0, 1], extrapolate: 'clamp' });

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get(`/exams/${exam._id}/rank-sheet`);
                setData(res.data);
            } catch {
                Alert.alert('Error', 'Failed to load rank sheet');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [exam._id]);

    const handleExportPDF = async () => {
        if (!data) return;
        setExporting(true);
        try {
            const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
            const rows = data.ranked.map((s: any) => `
                <tr style="border-bottom:1px solid #f0f0f0">
                    <td style="padding:12px 14px;text-align:center;font-weight:bold;color:${s.rank <= 3 ? RANK_COLORS[s.rank-1] : '#333'}">${s.rank}</td>
                    <td style="padding:12px 14px"><strong>${s.name}</strong><br/><span style="font-size:11px;color:#888">${s.knownId}</span></td>
                    <td style="padding:12px 14px;text-align:center">${s.totalScore} / ${s.totalMax}</td>
                    <td style="padding:12px 14px;text-align:center;font-weight:bold">${s.percentage}%</td>
                    <td style="padding:12px 14px;text-align:center">
                        <span style="background:${GRADE_COLORS[s.grade] || '#999'};color:white;padding:3px 10px;border-radius:12px;font-weight:bold;font-size:12px">${s.grade}</span>
                    </td>
                    <td style="padding:12px 14px;text-align:center;color:${s.passed ? '#27ae60' : '#e74c3c'};font-weight:bold">${s.passed ? 'PASS' : 'FAIL'}</td>
                </tr>
            `).join('');

            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
            <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Helvetica,Arial,sans-serif;color:#1a1a2e;}
            .header{background:linear-gradient(135deg,#1abc9c,#0e6655);padding:32px 40px 24px;color:white;}
            .brand{font-size:22px;font-weight:800;}.brand-sub{font-size:11px;opacity:0.8;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}
            .title{font-size:30px;font-weight:800;margin-top:20px;}.sub{font-size:13px;opacity:0.85;margin-top:4px;}
            .meta{text-align:right;font-size:12px;line-height:1.8;opacity:0.9;}
            .content{padding:32px 40px;}
            .section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:2px solid #f0f0f0;padding-bottom:8px;margin-bottom:16px;margin-top:28px;}
            .stats{display:flex;gap:16px;margin-bottom:32px;}
            .stat{flex:1;background:#f8fafc;border-radius:10px;padding:16px;text-align:center;}
            .stat-val{font-size:22px;font-weight:800;color:#1abc9c;}.stat-lbl{font-size:11px;color:#888;text-transform:uppercase;font-weight:600;margin-top:4px;}
            table{width:100%;border-collapse:collapse;font-size:13px;}
            thead tr{background:#1abc9c;color:white;}
            thead th{padding:12px 14px;text-align:left;font-weight:600;font-size:12px;}
            .footer{margin-top:48px;padding:20px 40px;background:#f8fafc;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;}
            .footer-brand{font-size:13px;font-weight:700;color:#1abc9c;}.footer-note{font-size:11px;color:#aaa;}
            </style></head><body>
            <div class="header">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div><div class="brand">EMS</div><div class="brand-sub">Enterprise Management System</div></div>
                    <div class="meta"><div><strong>Date:</strong> ${dateStr}</div><div><strong>Generated by:</strong> ${user?.name || 'Owner'}</div></div>
                </div>
                <div style="margin-top:20px;font-size:13px;opacity:0.8;text-transform:uppercase;letter-spacing:0.5px">Class Rank Sheet</div>
                <div class="title">${exam.name}</div>
                <div class="sub">${new Date(exam.startDate).toLocaleDateString()} – ${new Date(exam.endDate).toLocaleDateString()}</div>
            </div>
            <div class="content">
                <div class="section-title">Summary</div>
                <div class="stats">
                    <div class="stat"><div class="stat-val">${data.ranked.length}</div><div class="stat-lbl">Students Graded</div></div>
                    <div class="stat"><div class="stat-val">${data.ranked.filter((s: any) => s.passed).length}</div><div class="stat-lbl">Passed</div></div>
                    <div class="stat"><div class="stat-val">${data.ranked.filter((s: any) => !s.passed).length}</div><div class="stat-lbl">Failed</div></div>
                    <div class="stat"><div class="stat-val">${data.ranked.length > 0 ? Math.round(data.ranked.reduce((s: number, r: any) => s + r.percentage, 0) / data.ranked.length) : 0}%</div><div class="stat-lbl">Class Avg</div></div>
                </div>
                <div class="section-title">Rank Sheet</div>
                <table>
                    <thead><tr><th style="text-align:center">Rank</th><th>Student</th><th style="text-align:center">Marks</th><th style="text-align:center">Percentage</th><th style="text-align:center">Grade</th><th style="text-align:center">Status</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="footer"><div class="footer-brand">EMS — Enterprise Management System</div><div class="footer-note">Confidential — For Internal Use Only</div><div class="footer-note">Generated: ${dateStr}</div></div>
            </body></html>`;

            if (Platform.OS === 'web') {
                const blob = new Blob([html], { type: 'text/html' });
                window.open(URL.createObjectURL(blob), '_blank');
            } else {
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Rank Sheet' });
                }
            }
        } catch {
            Alert.alert('Error', 'Failed to export PDF');
        } finally {
            setExporting(false);
        }
    };

    const renderRankCard = (student: any) => {
        const isTop3 = student.rank <= 3;
        const gradeColor = GRADE_COLORS[student.grade] || '#999';
        const rankColor  = isTop3 ? RANK_COLORS[student.rank - 1] : theme.colors.textSecondary;

        return (
            <View key={student.memberId} style={[styles.rankCard, isTop3 && { borderLeftWidth: 4, borderLeftColor: rankColor }]}>
                {/* Rank Badge */}
                <View style={[styles.rankBadge, isTop3 && { backgroundColor: rankColor }]}>
                    {isTop3 ? (
                        <Ionicons name="trophy" size={14} color="white" />
                    ) : (
                        <Text style={styles.rankNumber}>{student.rank}</Text>
                    )}
                </View>

                {/* Student Info */}
                <View style={styles.rankInfo}>
                    <Text style={styles.rankName} numberOfLines={1}>{student.name}</Text>
                    <Text style={styles.rankId}>ID: {student.knownId}</Text>
                </View>

                {/* Scores */}
                <View style={styles.rankScores}>
                    <Text style={styles.rankMarks}>{student.totalScore}<Text style={styles.rankMax}>/{student.totalMax}</Text></Text>
                    <Text style={styles.rankPct}>{student.percentage}%</Text>
                </View>

                {/* Grade Badge */}
                <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '20', borderColor: gradeColor }]}>
                    <Text style={[styles.gradeText, { color: gradeColor }]}>{student.grade}</Text>
                </View>
            </View>
        );
    };

    const classAvg = data?.ranked.length > 0
        ? Math.round(data.ranked.reduce((s: number, r: any) => s + r.percentage, 0) / data.ranked.length)
        : 0;

    return (
        <View style={styles.container}>
            {/* Animated Header */}
            <Animated.View style={[styles.animatedHeader, { height: headerHeight }]}>
                <LinearGradient colors={theme.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Animated.Text style={[styles.stickyTitle, { opacity: titleOpacity }]} numberOfLines={1}>
                        {exam.name} — Results
                    </Animated.Text>
                    <TouchableOpacity onPress={handleExportPDF} style={styles.iconButton} disabled={exporting}>
                        {exporting ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="document-text-outline" size={22} color="white" />}
                    </TouchableOpacity>
                </View>
                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <Text style={styles.heroTitle} numberOfLines={1}>{exam.name}</Text>
                    <Text style={styles.heroSub}>Class Rank Sheet  •  {data?.ranked.length || 0} Students</Text>
                </Animated.View>
            </Animated.View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
            ) : (
                <Animated.ScrollView
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                    scrollEventThrottle={16}
                >
                    {/* Summary KPIs */}
                    <View style={styles.kpiRow}>
                        <View style={[styles.kpiBox, { borderLeftColor: theme.colors.success }]}>
                            <Text style={[styles.kpiVal, { color: theme.colors.success }]}>{data?.ranked.filter((s: any) => s.passed).length}</Text>
                            <Text style={styles.kpiLbl}>Passed</Text>
                        </View>
                        <View style={[styles.kpiBox, { borderLeftColor: theme.colors.danger }]}>
                            <Text style={[styles.kpiVal, { color: theme.colors.danger }]}>{data?.ranked.filter((s: any) => !s.passed).length}</Text>
                            <Text style={styles.kpiLbl}>Failed</Text>
                        </View>
                        <View style={[styles.kpiBox, { borderLeftColor: theme.colors.primary }]}>
                            <Text style={[styles.kpiVal, { color: theme.colors.primary }]}>{classAvg}%</Text>
                            <Text style={styles.kpiLbl}>Class Avg</Text>
                        </View>
                    </View>

                    {/* Section Header */}
                    <Text style={styles.sectionLabel}>RANK SHEET</Text>

                    {data?.ranked.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="trophy-outline" size={48} color={theme.colors.border} />
                            <Text style={styles.emptyText}>No results graded yet.</Text>
                        </View>
                    ) : (
                        data.ranked.map(renderRankCard)
                    )}

                    <View style={{ height: 40 }} />
                </Animated.ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    animatedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, ...theme.shadows.lg },
    topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: Platform.OS === 'ios' ? 100 : 80, paddingTop: Platform.OS === 'ios' ? 40 : 20 },
    iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    stickyTitle: { fontSize: 16, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center', marginHorizontal: 8 },
    heroContent: { paddingHorizontal: 24, paddingTop: 8 },
    heroTitle: { fontSize: 24, fontWeight: '800', color: 'white' },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    listContent: { paddingTop: Platform.OS === 'ios' ? 200 : 180, paddingHorizontal: 16, paddingBottom: 40 },
    kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    kpiBox: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, borderLeftWidth: 4, ...theme.shadows.sm },
    kpiVal: { fontSize: 22, fontWeight: '800' },
    kpiLbl: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 },
    rankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
    rankBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: theme.colors.border },
    rankNumber: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textSecondary },
    rankInfo: { flex: 1 },
    rankName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
    rankId: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    rankScores: { alignItems: 'flex-end', marginRight: 12 },
    rankMarks: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
    rankMax: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '400' },
    rankPct: { fontSize: 12, color: theme.colors.textSecondary },
    gradeBadge: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    gradeText: { fontSize: 13, fontWeight: '800' },
    emptyBox: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 12 },
});
