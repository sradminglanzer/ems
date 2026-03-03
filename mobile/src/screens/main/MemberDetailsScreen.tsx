import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, FlatList, Platform, Modal, TextInput, Alert
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';

export default function MemberDetailsScreen() {
    const { user } = useContext(AuthContext);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { member } = route.params;

    const [payments, setPayments] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Collect Fee Modal
    const [feeModalVisible, setFeeModalVisible] = useState(false);
    const [feeAmount, setFeeAmount] = useState('');
    const [feeNotes, setFeeNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [payRes, resRes] = await Promise.all([
                api.get(`/fee-payments?memberId=${member._id}`),
                api.get(`/exams/member/${member._id}/results`)
            ]);
            setPayments(payRes.data);
            setResults(resRes.data);
        } catch (error) {
            console.error('Error loading member data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCollectFee = async () => {
        if (!feeAmount) return alert('Amount is required!');
        setIsSubmitting(true);
        try {
            await api.post('/fee-payments', {
                memberId: member._id,
                amount: parseFloat(feeAmount),
                notes: feeNotes
            });
            setFeeModalVisible(false);
            setFeeAmount('');
            setFeeNotes('');
            loadData();
        } catch (error) {
            console.error(error);
            alert('Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateMember = () => {
        navigation.navigate('AddMember', { memberToEdit: member });
    };

    const handleDeleteMember = () => {
        const executeDelete = async () => {
            try {
                await api.delete(`/members/${member._id}`);
                navigation.goBack();
            } catch (e: any) {
                const msg = e?.response?.data?.message || 'Error deleting member';
                Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to completely remove this student?")) {
                executeDelete();
            }
        } else {
            Alert.alert(
                "Delete Student",
                "Are you sure you want to completely remove this student?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: executeDelete }
                ]
            );
        }
    };

    return (
        <View style={globalStyles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Student Details</Text>
                {user?.role !== 'parent' && (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={handleUpdateMember}>
                            <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDeleteMember}>
                            <Ionicons name="trash-outline" size={24} color="red" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={globalStyles.centerMode}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={payments}
                    keyExtractor={item => item._id}
                    contentContainerStyle={globalStyles.listContainer}
                    ListHeaderComponent={
                        <>
                            <View style={styles.profileCard}>
                                <Ionicons name="person-circle-outline" size={64} color={theme.colors.primary} />
                                <Text style={styles.name}>{member.firstName} {member.lastName}</Text>

                                <View style={{ width: '100%', marginTop: theme.spacing.m, backgroundColor: theme.colors.background, padding: theme.spacing.m, borderRadius: theme.borderRadius.m }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 8 }}>Personal Details</Text>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={styles.info}><Text style={{ fontWeight: '600' }}>Roll No:</Text> {member.knownId}</Text>
                                        {member.groupName && <Text style={styles.info}><Text style={{ fontWeight: '600' }}>Group:</Text> {member.groupName}</Text>}
                                    </View>

                                    {member.dob && <Text style={styles.info}><Text style={{ fontWeight: '600' }}>DOB:</Text> {new Date(member.dob).toLocaleDateString()}</Text>}
                                    {member.contact && <Text style={styles.info}><Text style={{ fontWeight: '600' }}>Contact:</Text> {member.contact}</Text>}
                                    {member.address && <Text style={styles.info}><Text style={{ fontWeight: '600' }}>Address:</Text> {member.address}</Text>}

                                    {(member.fatherOccupation || member.motherOccupation) && (
                                        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 4 }}>Parents</Text>
                                            {member.fatherOccupation && !['no', 'none', 'n/a', 'na', '-', 'nil'].includes(member.fatherOccupation.toLowerCase().trim()) && (
                                                <Text style={styles.info}><Text style={{ fontWeight: '600' }}>Father Occupation:</Text> {member.fatherOccupation}</Text>
                                            )}
                                            {member.motherOccupation && !['no', 'none', 'n/a', 'na', '-', 'nil'].includes(member.motherOccupation.toLowerCase().trim()) && (
                                                <Text style={styles.info}><Text style={{ fontWeight: '600' }}>Mother Occupation:</Text> {member.motherOccupation}</Text>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {user?.role !== 'teacher' && (
                                    <View style={styles.feeStats}>
                                        <View style={styles.feeStatBox}>
                                            <Text style={styles.feeStatLabel}>Total Fee</Text>
                                            <Text style={styles.feeStatValue}>₹{member.totalFee || 0}</Text>
                                        </View>
                                        <View style={styles.feeStatBox}>
                                            <Text style={styles.feeStatLabel}>Paid</Text>
                                            <Text style={styles.feeStatValue}>₹{payments.reduce((acc, p) => acc + p.amount, 0)}</Text>
                                        </View>
                                        <View style={styles.feeStatBox}>
                                            <Text style={styles.feeStatLabel}>Pending</Text>
                                            <Text style={[styles.feeStatValue, { color: theme.colors.danger }]}>
                                                ₹{Math.max(0, (member.totalFee || 0) - payments.reduce((acc, p) => acc + p.amount, 0))}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {results.length > 0 && (
                                <View style={{ width: '100%', marginTop: theme.spacing.m, backgroundColor: theme.colors.background, padding: theme.spacing.m, borderRadius: theme.borderRadius.m }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 8 }}>Exam Results</Text>
                                    {results.map(r => (
                                        <View key={r._id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text style={{ fontWeight: 'bold', fontSize: 14, color: theme.colors.textPrimary }}>{r.examName || 'Exam'}</Text>
                                                {r.remarks && <Text style={{ color: theme.colors.textMuted, fontStyle: 'italic', fontSize: 12 }}>{r.remarks}</Text>}
                                            </View>
                                            {Array.isArray(r.marks) ? (
                                                r.marks.map((m: any, i: number) => (
                                                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 8, marginBottom: 2 }}>
                                                        <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>{m.subjectName}</Text>
                                                        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.colors.textPrimary }}>
                                                            {m.score !== null && m.score !== undefined ? m.score : '-'}/{m.maxScore}
                                                        </Text>
                                                    </View>
                                                ))
                                            ) : (
                                                <Text style={styles.info}>Score: {r.marks !== null && r.marks !== undefined ? String(r.marks) : 'N/A'}</Text>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {user?.role !== 'teacher' && (
                                <View style={styles.paymentSectionHeader}>
                                    <Text style={styles.sectionTitle}>Payment History</Text>
                                    {user?.role !== 'parent' && (
                                        <TouchableOpacity style={styles.collectButton} onPress={() => setFeeModalVisible(true)}>
                                            <Text style={styles.collectButtonText}>Collect Fee</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </>
                    }
                    ListEmptyComponent={user?.role !== 'teacher' ? <Text style={globalStyles.emptyText}>No payments found.</Text> : null}
                    renderItem={({ item }) => (
                        <View style={globalStyles.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.paymentAmount}>₹{item.amount}</Text>
                                <Text style={styles.paymentDate}>{new Date(item.paymentDate).toLocaleDateString()}</Text>
                            </View>
                            {item.notes ? (
                                <Text style={styles.notesText}>{item.notes}</Text>
                            ) : null}
                        </View>
                    )}
                />
            )}

            <Modal animationType="slide" transparent={true} visible={feeModalVisible} onRequestClose={() => setFeeModalVisible(false)}>
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Collect Fee</Text>
                            <TouchableOpacity onPress={() => setFeeModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Amount (₹)</Text>
                        <TextInput style={globalStyles.input} placeholder="e.g. 5000" keyboardType="numeric" value={feeAmount} onChangeText={setFeeAmount} />

                        <Text style={globalStyles.label}>Notes</Text>
                        <TextInput style={globalStyles.input} placeholder="Term 1 Fee..." value={feeNotes} onChangeText={setFeeNotes} />

                        <TouchableOpacity style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]} onPress={handleCollectFee} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>Confirm Payment</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.m,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: { padding: theme.spacing.xs },
    headerTitle: { fontSize: 20, fontWeight: '600', color: theme.colors.textPrimary },
    profileCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.xl,
        alignItems: 'center',
        margin: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1, borderColor: theme.colors.border
    },
    name: { fontSize: 22, fontWeight: '600', color: theme.colors.textPrimary, marginVertical: theme.spacing.s },
    info: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 4 },
    feeStats: {
        flexDirection: 'row',
        marginTop: theme.spacing.l,
        width: '100%',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.m
    },
    feeStatBox: {
        alignItems: 'center',
        flex: 1
    },
    feeStatLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: '500'
    },
    feeStatValue: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary
    },
    paymentSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.s
    },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
    collectButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.s,
        borderRadius: theme.borderRadius.s
    },
    collectButtonText: { color: theme.colors.surface, fontWeight: '600', fontSize: 12, textTransform: 'uppercase' },
    paymentAmount: { fontSize: 18, fontWeight: '600', color: theme.colors.primary },
    paymentDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
    notesText: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic', maxWidth: '40%' }
});
