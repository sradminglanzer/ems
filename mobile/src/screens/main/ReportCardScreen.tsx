import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Platform
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

export default function ReportCardScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { member } = route.params;
    const { user, selectedAcademicYearId } = useContext(AuthContext);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const params: any = {};
                if (selectedAcademicYearId) params.academicYearId = selectedAcademicYearId;
                const res = await api.get(`/exams/member/${member._id}/report-card`, { params });
                setData(res.data);
            } catch {
                Alert.alert('Error', 'Failed to load report card');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [member._id, selectedAcademicYearId]);

    const handleExportPDF = async () => {
        if (!data) return;
        setExporting(true);
        try {
            const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
            const cum = data.cumulative;
            const gradeColor = GRADE_COLORS[cum.grade] || '#999';

            const examSections = data.examBreakdowns.map((eb: any) => {
                if (!eb.attempted) return `
                    <div style="margin-bottom:24px;background:#f8fafc;border-radius:10px;padding:16px;border-left:4px solid #ddd">
                        <div style="font-size:14px;font-weight:bold;color:#333">${eb.exam.name}</div>
                        <div style="font-size:12px;color:#aaa;margin-top:4px">Not attempted</div>
                    </div>`;

                const rows = eb.marks.map((m: any) => {
                    const pct = m.maxScore > 0 ? Math.round((m.score / m.maxScore) * 100) : 0;
                    return `<tr style="border-bottom:1px solid #f0f0f0">
                        <td style="padding:10px 14px">${m.subjectName}</td>
                        <td style="padding:10px 14px;text-align:center;font-weight:bold">${m.score} / ${m.maxScore}</td>
                        <td style="padding:10px 14px;text-align:center">${pct}%</td>
                    </tr>`;
                }).join('');

                return `
                    <div style="margin-bottom:28px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                            <div><div style="font-size:15px;font-weight:800;color:#1a1a2e">${eb.exam.name}</div>
                            <div style="font-size:11px;color:#888">${new Date(eb.exam.startDate).toLocaleDateString()} – ${new Date(eb.exam.endDate).toLocaleDateString()}</div></div>
                            <span style="background:${GRADE_COLORS[eb.grade] || '#999'};color:white;padding:4px 12px;border-radius:14px;font-weight:bold;font-size:13px">${eb.grade}</span>
                        </div>
                        <table style="width:100%;border-collapse:collapse;font-size:13px">
                            <thead><tr style="background:#f0f9f6"><th style="padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;color:#888">Subject</th><th style="padding:10px 14px;text-align:center;font-size:11px;text-transform:uppercase;color:#888">Marks</th><th style="padding:10px 14px;text-align:center;font-size:11px;text-transform:uppercase;color:#888">%</th></tr></thead>
                            <tbody>${rows}</tbody>
                            <tfoot><tr style="background:#f8fafc"><td style="padding:10px 14px;font-weight:bold">TOTAL</td><td style="padding:10px 14px;text-align:center;font-weight:bold">${eb.totalScore} / ${eb.totalMax}</td><td style="padding:10px 14px;text-align:center;font-weight:bold">${eb.percentage}%</td></tr></tfoot>
                        </table>
                        ${eb.remarks ? `<div style="margin-top:8px;font-size:12px;color:#666;font-style:italic;background:#fffbf0;padding:8px 12px;border-radius:8px;border-left:3px solid #f39c12">Remarks: ${eb.remarks}</div>` : ''}
                    </div>`;
            }).join('');

            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
            <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Helvetica,Arial,sans-serif;color:#1a1a2e;}
            .header{background:linear-gradient(135deg,#1abc9c,#0e6655);padding:32px 40px 28px;color:white;}
            .brand{font-size:22px;font-weight:800;}.brand-sub{font-size:11px;opacity:0.8;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}
            .content{padding:32px 40px;}
            .student-card{display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:32px;border-left:4px solid #1abc9c;}
            .cumulative{display:flex;gap:12px;margin-bottom:32px;}
            .cum-box{flex:1;background:#f8fafc;border-radius:10px;padding:14px;text-align:center;}
            .cum-val{font-size:20px;font-weight:800;}.cum-lbl{font-size:10px;color:#888;text-transform:uppercase;margin-top:3px;font-weight:600;}
            .section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:2px solid #f0f0f0;padding-bottom:8px;margin-bottom:20px;margin-top:28px;}
            .footer{margin-top:48px;padding:20px 40px;background:#f8fafc;border-top:1px solid #eee;display:flex;justify-content:space-between;}
            .sig-line{border-top:1px solid #333;width:160px;margin-top:40px;padding-top:6px;font-size:11px;color:#888;text-align:center;}
            </style></head><body>
            <div class="header">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div><div class="brand">EMS</div><div class="brand-sub">Enterprise Management System</div></div>
                    <div style="text-align:right;font-size:12px;line-height:1.8;opacity:0.9"><div><strong>Date:</strong> ${dateStr}</div></div>
                </div>
                <div style="margin-top:20px;font-size:13px;opacity:0.8;text-transform:uppercase;letter-spacing:0.5px">Student Report Card</div>
                <div style="font-size:30px;font-weight:800;margin-top:4px">${data.member.name}</div>
                <div style="font-size:14px;opacity:0.85;margin-top:4px">ID: ${data.member.knownId}</div>
            </div>
            <div class="content">
                <div class="section-title">Cumulative Performance</div>
                <div class="cumulative">
                    <div class="cum-box"><div class="cum-val" style="color:${gradeColor}">${cum.grade}</div><div class="cum-lbl">Overall Grade</div></div>
                    <div class="cum-box"><div class="cum-val" style="color:#2980b9">${cum.percentage}%</div><div class="cum-lbl">Overall %</div></div>
                    <div class="cum-box"><div class="cum-val" style="color:${cum.passed ? '#27ae60' : '#e74c3c'}">${cum.passed ? 'PASS' : 'FAIL'}</div><div class="cum-lbl">Result</div></div>
                    <div class="cum-box"><div class="cum-val">${cum.examsAttempted}/${cum.totalExams}</div><div class="cum-lbl">Exams</div></div>
                </div>
                <div class="section-title">Exam-wise Breakdown</div>
                ${examSections}
                <div style="display:flex;justify-content:space-between;margin-top:48px">
                    <div class="sig-line">Class Teacher</div>
                    <div class="sig-line">Principal</div>
                    <div class="sig-line">Parent / Guardian</div>
                </div>
            </div>
            <div class="footer"><div style="font-size:13px;font-weight:700;color:#1abc9c">EMS — Enterprise Management System</div><div style="font-size:11px;color:#aaa">Generated: ${dateStr}</div></div>
            </body></html>`;

            if (Platform.OS === 'web') {
                const blob = new Blob([html], { type: 'text/html' });
                window.open(URL.createObjectURL(blob), '_blank');
            } else {
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Report Card' });
                }
            }
        } catch {
            Alert.alert('Error', 'Failed to export report card');
        } finally {
            setExporting(false);
        }
    };

    const cum = data?.cumulative;
    const gradeColor = cum ? (GRADE_COLORS[cum.grade] || '#999') : theme.colors.primary;

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient colors={theme.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Report Card</Text>
                    <TouchableOpacity onPress={handleExportPDF} style={styles.iconButton} disabled={exporting}>
                        {exporting ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="document-text-outline" size={22} color="white" />}
                    </TouchableOpacity>
                </View>
                <View style={styles.studentInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{member.firstName?.charAt(0)}{member.lastName?.charAt(0)}</Text>
                    </View>
                    <Text style={styles.studentName}>{member.firstName} {member.lastName}</Text>
                    <Text style={styles.studentId}>ID: {member.knownId}</Text>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Cumulative Card */}
                    {cum && (
                        <View style={styles.cumulativeCard}>
                            <Text style={styles.cumulativeTitle}>Overall Performance</Text>
                            <View style={styles.cumulativeRow}>
                                <View style={styles.gradeCircle}>
                                    <Text style={[styles.gradeCircleText, { color: gradeColor }]}>{cum.grade}</Text>
                                </View>
                                <View style={styles.cumulativeStats}>
                                    <View style={styles.cumStat}>
                                        <Text style={[styles.cumStatVal, { color: gradeColor }]}>{cum.percentage}%</Text>
                                        <Text style={styles.cumStatLbl}>Overall</Text>
                                    </View>
                                    <View style={styles.cumStat}>
                                        <Text style={[styles.cumStatVal, { color: cum.passed ? theme.colors.success : theme.colors.danger }]}>
                                            {cum.passed ? 'PASS' : 'FAIL'}
                                        </Text>
                                        <Text style={styles.cumStatLbl}>Result</Text>
                                    </View>
                                    <View style={styles.cumStat}>
                                        <Text style={styles.cumStatVal}>{cum.examsAttempted}/{cum.totalExams}</Text>
                                        <Text style={styles.cumStatLbl}>Exams</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Per-Exam Cards */}
                    <Text style={styles.sectionLabel}>EXAM-WISE BREAKDOWN</Text>

                    {data?.examBreakdowns.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="document-outline" size={48} color={theme.colors.border} />
                            <Text style={styles.emptyText}>No exam results found for this student.</Text>
                        </View>
                    ) : (
                        data.examBreakdowns.map((eb: any, i: number) => {
                            const gc = eb.attempted ? (GRADE_COLORS[eb.grade] || '#999') : '#ccc';
                            return (
                                <View key={i} style={styles.examCard}>
                                    {/* Exam Header */}
                                    <View style={styles.examCardHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.examName}>{eb.exam?.name}</Text>
                                            {eb.exam?.startDate && (
                                                <Text style={styles.examDate}>{new Date(eb.exam.startDate).toLocaleDateString()} – {new Date(eb.exam.endDate).toLocaleDateString()}</Text>
                                            )}
                                        </View>
                                        {eb.attempted ? (
                                            <View style={[styles.gradePill, { backgroundColor: gc + '20', borderColor: gc }]}>
                                                <Text style={[styles.gradePillText, { color: gc }]}>{eb.grade}</Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.gradePill, { backgroundColor: '#f0f0f0', borderColor: '#ccc' }]}>
                                                <Text style={{ fontSize: 11, color: '#aaa', fontWeight: '600' }}>N/A</Text>
                                            </View>
                                        )}
                                    </View>

                                    {!eb.attempted ? (
                                        <Text style={styles.notAttempted}>Not attempted</Text>
                                    ) : (
                                        <>
                                            {/* Subject Table */}
                                            <View style={styles.table}>
                                                <View style={styles.tableHeader}>
                                                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Subject</Text>
                                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Marks</Text>
                                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>%</Text>
                                                </View>
                                                {eb.marks.map((m: any, j: number) => {
                                                    const pct = m.maxScore > 0 ? Math.round((m.score / m.maxScore) * 100) : 0;
                                                    return (
                                                        <View key={j} style={styles.tableRow}>
                                                            <Text style={[styles.tableCell, { flex: 2 }]}>{m.subjectName}</Text>
                                                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', fontWeight: '700' }]}>{m.score}/{m.maxScore}</Text>
                                                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{pct}%</Text>
                                                        </View>
                                                    );
                                                })}
                                                <View style={styles.tableFooter}>
                                                    <Text style={[styles.tableFooterText, { flex: 2 }]}>TOTAL</Text>
                                                    <Text style={[styles.tableFooterText, { flex: 1, textAlign: 'center' }]}>{eb.totalScore}/{eb.totalMax}</Text>
                                                    <Text style={[styles.tableFooterText, { flex: 1, textAlign: 'center', color: gc }]}>{eb.percentage}%</Text>
                                                </View>
                                            </View>
                                            {eb.remarks ? (
                                                <View style={styles.remarksBox}>
                                                    <Ionicons name="chatbubble-outline" size={14} color={theme.colors.secondary} />
                                                    <Text style={styles.remarksText}>{eb.remarks}</Text>
                                                </View>
                                            ) : null}
                                        </>
                                    )}
                                </View>
                            );
                        })
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, ...theme.shadows.lg, paddingBottom: 24 },
    topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: Platform.OS === 'ios' ? 100 : 80, paddingTop: Platform.OS === 'ios' ? 40 : 20 },
    iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
    studentInfo: { alignItems: 'center', paddingBottom: 8 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    avatarText: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    studentName: { fontSize: 22, fontWeight: '800', color: 'white' },
    studentId: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    content: { padding: 16, paddingTop: 20 },
    cumulativeCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, marginBottom: 20, ...theme.shadows.sm, borderWidth: 1, borderColor: theme.colors.border },
    cumulativeTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    cumulativeRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    gradeCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.colors.border },
    gradeCircleText: { fontSize: 24, fontWeight: '900' },
    cumulativeStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
    cumStat: { alignItems: 'center' },
    cumStatVal: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
    cumStatLbl: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 },
    examCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, ...theme.shadows.sm, borderWidth: 1, borderColor: theme.colors.border },
    examCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    examName: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
    examDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    gradePill: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
    gradePillText: { fontSize: 13, fontWeight: '800' },
    notAttempted: { fontSize: 13, color: theme.colors.textSecondary, fontStyle: 'italic' },
    table: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: theme.colors.primaryLight + '15', paddingVertical: 9, paddingHorizontal: 12 },
    tableHeaderText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: theme.colors.border + '50' },
    tableCell: { fontSize: 14, color: theme.colors.textPrimary },
    tableFooter: { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 12, backgroundColor: theme.colors.background, borderTopWidth: 1, borderTopColor: theme.colors.border },
    tableFooterText: { fontSize: 14, fontWeight: '800', color: theme.colors.textPrimary },
    remarksBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, backgroundColor: theme.colors.secondary + '10', padding: 10, borderRadius: 8 },
    remarksText: { fontSize: 13, color: theme.colors.secondary, fontStyle: 'italic', flex: 1 },
    emptyBox: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { fontSize: 15, color: theme.colors.textSecondary, marginTop: 12, textAlign: 'center' },
});
