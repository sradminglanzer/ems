import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, FlatList, Platform, Modal, TextInput, Alert, Animated, ScrollView, Image, Linking
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getTerm } from '../../utils/terminology';

const FREQUENCY_LABELS: Record<string, string> = {
    daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
    quarterly: 'Quarterly', 'half-yearly': 'Half-Yearly',
    annual: 'Annual', 'one-time': 'One-Time',
};
import { generateAndShareInvoice } from '../../utils/InvoiceGenerator';

export default function MemberDetailsScreen() {
    const { user, selectedAcademicYearId } = useContext(AuthContext);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { member } = route.params;

    const scrollY = React.useRef(new Animated.Value(0)).current;

    const [payments, setPayments] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [successModalData, setSuccessModalData] = useState<any | null>(null);

    // Collect Fee Modal Checkout Cart
    const [feeModalVisible, setFeeModalVisible] = useState(false);
    const [cartPayments, setCartPayments] = useState<Record<string, {
        amount: string,
        nextPaymentDate: Date | null,
        nextPaymentDateStr: string,
        showPicker: boolean,
        notes: string,
        checked: boolean,
        isOverriding: boolean,
        autoNextDate: Date | null,
        baseDate?: Date,
    }>>({});
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [allFeeStructures, setAllFeeStructures] = useState<any[]>([]);
    const [activeAddons, setActiveAddons] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Hold / Resume state
    const [memberStatus, setMemberStatus] = useState<'active' | 'on_hold'>(member.status || 'active');
    const [holdStartDate, setHoldStartDate] = useState<Date | null>(member.holdStartDate ? new Date(member.holdStartDate) : null);
    const [holdHistory, setHoldHistory] = useState<{ holdDate: Date; resumeDate: Date }[]>(
        (member.holdHistory || []).map((h: any) => ({ holdDate: new Date(h.holdDate), resumeDate: new Date(h.resumeDate) }))
    );
    const [resumeModalVisible, setResumeModalVisible] = useState(false);
    const [resumeAmount, setResumeAmount] = useState('');
    const [resumeMethod, setResumeMethod] = useState('cash');
    const [resumeDateStr, setResumeDateStr] = useState('');
    const [resumeDate, setResumeDate] = useState<Date | null>(null);
    const [showResumePicker, setShowResumePicker] = useState(false);
    const [isHoldSubmitting, setIsHoldSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [selectedAcademicYearId]);

    const loadData = async () => {
        try {
            const params = selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {};
            const [payRes, resRes, structRes] = await Promise.all([
                api.get(`/fee-payments?memberId=${member._id}`, { params }),
                api.get(`/exams/member/${member._id}/results`, { params }),
                api.get('/fee-structures')
            ]);
            setPayments(payRes.data);
            setResults(resRes.data);
            
            // Filter structures to only those assigned to the member (Group + Add-ons)
            setAllFeeStructures(structRes.data);
            setFeeStructures(structRes.data.filter((s: any) => {
                const isGroupFee = member.feeGroupId && s.feeGroupId === member.feeGroupId;
                const isAddonFee = !s.feeGroupId && member.addonFeeIds?.includes(s._id);
                // If member hasn't set up group yet, show all to prevent empty list, but ideally they shouldn't collect until group set
                return isGroupFee || isAddonFee || (!member.feeGroupId && !member.addonFeeIds?.length); 
            }));
        } catch (error) {
            console.error('Error loading member data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateNextDate = (frequency: string, baseDate?: Date) => {
        const d = baseDate ? new Date(baseDate) : new Date();
        if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
        else if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
        else if (frequency === 'half-yearly') d.setMonth(d.getMonth() + 6);
        else if (frequency === 'annual' || frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
        else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
        else if (frequency === 'daily') d.setDate(d.getDate() + 1);
        return d;
    };

    const handleOpenFeeModal = () => {
        setFeeModalVisible(true);
        setActiveAddons(member.addonFeeIds || []);
        
        const newCart: any = {};
        // Initialize all structures in case they select a new one inside the modal
        allFeeStructures.forEach(s => {
            // Find the most recent payment for this specific fee structure
            const lastPayment = [...payments]
                .filter((p: any) => p.feeStructureId === s._id || p.feeStructureId?.toString() === s._id)
                .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];

            const baseDate = lastPayment ? new Date(lastPayment.paymentDate) : undefined;
            const nextD = s.frequency === 'one-time' ? new Date() : calculateNextDate(s.frequency, baseDate);
            const tzOffset = new Date().getTimezoneOffset() * 60000;
            const localISOTime = new Date(nextD.getTime() - tzOffset).toISOString().slice(0, 10);

            const isGroupFee = member.feeGroupId && s.feeGroupId === member.feeGroupId;
            const isAddonFee = !s.feeGroupId && (member.addonFeeIds?.includes(s._id) || false);
            const isAssigned = isGroupFee || isAddonFee || (!member.feeGroupId && !member.addonFeeIds?.length);

            newCart[s._id] = {
                amount: String(s.amount),
                nextPaymentDate: nextD,
                nextPaymentDateStr: localISOTime,
                showPicker: false,
                notes: '',
                checked: isAssigned,
                isOverriding: false,
                autoNextDate: nextD,
                baseDate,
            };
        });
        setCartPayments(newCart);
    };

    const handleCollectFee = async () => {
        // Collect from either the newly selected active addons (gym) or standard fee structures (school)
        const activeStructures = user?.entityType === 'gym' 
            ? allFeeStructures.filter(s => activeAddons.includes(s._id))
            : feeStructures;

        const paymentsToSubmit = activeStructures
            .filter(s => cartPayments[s._id]?.checked)
            .map(s => {
                const cartItem = cartPayments[s._id];
                return {
                    memberId: member._id,
                    feeStructureId: s._id,
                    ...(s.feeGroupId ? { feeGroupId: s.feeGroupId } : {}),
                    amount: parseFloat(cartItem.amount || '0'),
                    notes: cartItem.notes,
                    ...(user?.entityType !== 'gym' && selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {}),
                    nextPaymentDate: Platform.OS === 'web' 
                        ? (cartItem.nextPaymentDateStr || undefined) 
                        : (cartItem.nextPaymentDate ? cartItem.nextPaymentDate.toISOString().split('T')[0] : undefined)
                };
            })
            .filter(p => !isNaN(p.amount) && p.amount > 0);

        if (paymentsToSubmit.length === 0) {
            return alert('Please select at least one package and enter a valid amount.');
        }

        setIsSubmitting(true);
        try {
            // Save updated addons to member profile first
            if (user?.entityType === 'gym') {
                await api.put(`/members/${member._id}`, { addonFeeIds: activeAddons });
            }

            const response = await api.post('/fee-payments', { payments: paymentsToSubmit });
            const assignedReceiptNo = response.data?.[0]?.receiptNo || `REC-${Date.now().toString().slice(-6)}`;

            
            // Trigger Receipt Generation
            if (user?.entityType === 'gym') {
                const selectedItems = feeStructures.filter(s => cartPayments[s._id]?.checked);
                const totalAmount = paymentsToSubmit.reduce((sum, p) => sum + p.amount, 0);
                const nextDates = paymentsToSubmit.map(p => p.nextPaymentDate).filter(Boolean);
                const representativeRenewal = nextDates.length > 0 ? nextDates[0] : undefined;
                
                setSuccessModalData({
                    receiptNo: assignedReceiptNo,
                    date: new Date(),
                    member: {
                        name: `${member.firstName} ${member.lastName}`.trim(),
                        knownId: member.knownId || 'N/A',
                        contact: member.contact || 'N/A'
                    },
                    gymName: user?.entityName || 'Gym',
                    items: selectedItems.map(s => ({
                        description: s.name,
                        amount: parseFloat(cartPayments[s._id].amount || '0')
                    })),
                    totalPaid: totalAmount,
                    paymentMethod: 'Manual Payment',
                    nextRenewalDate: representativeRenewal ? new Date(representativeRenewal) : undefined
                });
            }

            setFeeModalVisible(false);
            setCartPayments({});
            loadData();
        } catch (error) {
            console.error(error);
            alert('Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrintPastInvoice = async (item: any) => {
        try {
            const structureName = feeStructures.find(s => s._id === item.feeStructureId)?.name || 'Fee Payment';
            await generateAndShareInvoice({
                receiptNo: item.receiptNo || 'N/A',
                date: new Date(item.paymentDate),
                member: {
                    name: `${member.firstName} ${member.lastName}`.trim(),
                    knownId: member.knownId || 'N/A',
                    contact: member.contact || 'N/A'
                },
                gymName: user?.entityName || 'Gym',
                items: [{
                    description: structureName,
                    amount: item.amount
                }],
                totalPaid: item.amount,
                paymentMethod: item.paymentMethod || 'cash',
                nextRenewalDate: item.nextPaymentDate ? new Date(item.nextPaymentDate) : undefined
            });
        } catch (e) {
            console.error('Invoice print error:', e);
            alert('Failed to print receipt.');
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
            if (window.confirm(`Are you sure you want to completely remove this ${getTerm('Student', user?.entityType).toLowerCase()}?`)) {
                executeDelete();
            }
        } else {
            Alert.alert(
                `Delete ${getTerm('Student', user?.entityType)}`,
                `Are you sure you want to completely remove this ${getTerm('Student', user?.entityType).toLowerCase()}?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: executeDelete }
                ]
            );
        }
    };

    const handleHold = () => {
        const execute = async () => {
            setIsHoldSubmitting(true);
            try {
                await api.put(`/members/${member._id}/hold`);
                setMemberStatus('on_hold');
                setHoldStartDate(new Date());
            } catch (e: any) {
                const msg = e?.response?.data?.message || 'Failed to place member on hold';
                Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
            } finally {
                setIsHoldSubmitting(false);
            }
        };
        const name = `${member.firstName} ${member.lastName}`;
        if (Platform.OS === 'web') {
            if (window.confirm(`Place ${name} on hold? They will be removed from overdue counts.`)) execute();
        } else {
            Alert.alert(
                'Place on Hold',
                `Place ${name} on hold?\nThey will be removed from overdue/due-soon counts until resumed.`,
                [{ text: 'Cancel', style: 'cancel' }, { text: 'Place on Hold', onPress: execute }]
            );
        }
    };

    const handleResume = async () => {
        setIsHoldSubmitting(true);
        try {
            const payload: any = {};
            if (resumeAmount && Number(resumeAmount) > 0) {
                payload.initialPayment = {
                    amount: Number(resumeAmount),
                    paymentMethod: resumeMethod,
                    nextPaymentDateStr: resumeDateStr || undefined,
                };
            }
            const res = await api.put(`/members/${member._id}/resume`, payload);

            // Update local state
            const newEntry = { holdDate: holdStartDate || new Date(), resumeDate: new Date() };
            setHoldHistory(prev => [...prev, newEntry]);
            setMemberStatus('active');
            setHoldStartDate(null);
            setResumeModalVisible(false);
            setResumeAmount('');
            setResumeMethod('cash');
            setResumeDateStr('');
            setResumeDate(null);

            // Show receipt if payment was collected
            if (res.data?.receiptNo && payload.initialPayment) {
                setSuccessModalData({
                    receiptNo: res.data.receiptNo,
                    date: new Date(),
                    member: { name: `${member.firstName} ${member.lastName}`.trim(), knownId: member.knownId || 'N/A', contact: member.contact || 'N/A' },
                    gymName: user?.entityName || 'Gym',
                    items: [{ description: 'Re-join Payment', amount: Number(resumeAmount) }],
                    totalPaid: Number(resumeAmount),
                    paymentMethod: resumeMethod,
                    nextRenewalDate: resumeDate || undefined
                });
            }

            loadData();
        } catch (e: any) {
            const msg = e?.response?.data?.message || 'Failed to resume member';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setIsHoldSubmitting(false);
        }
    };

    const renderHeader = () => {
        const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
        const totalFee = member.totalFee || 0;
        const pending = Math.max(0, totalFee - totalPaid);

        return (
            <View style={styles.contentContainer}>
                {/* Personal Details Card */}
                <View style={styles.glassCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Personal Details</Text>
                    </View>

                    <View style={styles.detailsGrid}>
                        {user?.entityType !== 'gym' && (
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>{getTerm('Roll No', user?.entityType)}</Text>
                                <Text style={styles.detailValue}>{member.knownId}</Text>
                            </View>
                        )}
                        {user?.entityType === 'gym' ? (
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Active Plans</Text>
                                <Text style={styles.detailValue}>{(member.addonNames && member.addonNames.length > 0) ? member.addonNames.join(', ') : 'None'}</Text>
                            </View>
                        ) : (
                            member.groupName ? (
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>{getTerm('Class', user?.entityType)} Enrolled</Text>
                                    <Text style={styles.detailValue}>{member.groupName}</Text>
                                </View>
                            ) : null
                        )}
                        {!!member.dob && (
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Date of Birth</Text>
                                <Text style={styles.detailValue}>{new Date(member.dob).toLocaleDateString()}</Text>
                            </View>
                        )}
                        {!!member.contact && (
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Contact Phone</Text>
                                <Text style={styles.detailValue}>{member.contact}</Text>
                            </View>
                        )}
                    </View>

                    {!!member.address && (
                        <View style={styles.fullWidthDetail}>
                            <Text style={styles.detailLabel}>Home Address</Text>
                            <Text style={styles.detailValue}>{member.address}</Text>
                        </View>
                    )}

                    {!!(member.fatherOccupation || member.motherOccupation) && (
                        <View style={styles.parentsSection}>
                            <Text style={styles.parentsTitle}>Parent Details</Text>
                            <View style={styles.detailsGrid}>
                                {!!member.fatherOccupation && !['no', 'none', 'n/a', 'na', '-', 'nil'].includes(member.fatherOccupation.toLowerCase().trim()) && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Father Occupation</Text>
                                        <Text style={styles.detailValue}>{member.fatherOccupation}</Text>
                                    </View>
                                )}
                                {!!member.motherOccupation && !['no', 'none', 'n/a', 'na', '-', 'nil'].includes(member.motherOccupation.toLowerCase().trim()) && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Mother Occupation</Text>
                                        <Text style={styles.detailValue}>{member.motherOccupation}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* Financial Overview (Not for teachers) */}
                {user?.role !== 'teacher' && (
                    <View style={styles.glassCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="wallet-outline" size={20} color={theme.colors.secondary} />
                            <Text style={styles.sectionTitle}>Financial Overview</Text>
                        </View>

                        <View style={styles.feeStatsContainer}>
                            <View style={styles.feeStatBox}>
                                <Text style={styles.feeStatLabel}>Total Fee</Text>
                                <Text style={styles.feeStatValue}>₹{totalFee.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={styles.feeStatBox}>
                                <Text style={styles.feeStatLabel}>Paid</Text>
                                <Text style={[styles.feeStatValue, { color: theme.colors.success }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={[styles.feeStatBox, { borderRightWidth: 0 }]}>
                                <Text style={styles.feeStatLabel}>Pending</Text>
                                <Text style={[styles.feeStatValue, { color: pending > 0 ? theme.colors.danger : theme.colors.textPrimary }]}>
                                    ₹{pending.toLocaleString('en-IN')}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Exam Results */}
                {results.length > 0 && user?.entityType !== 'gym' && (
                    <View style={styles.glassCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="school-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>Exam Performance</Text>
                        </View>

                        {results.map(r => (
                            <View key={r._id} style={styles.examResultCard}>
                                <View style={styles.examHeader}>
                                    <Text style={styles.examName}>{r.examName || 'Exam'}</Text>
                                    {!!r.remarks && <Text style={styles.examRemarks}>{r.remarks}</Text>}
                                </View>

                                {Array.isArray(r.marks) && r.marks.length > 0 ? (
                                    <View style={styles.tableContainer}>
                                        <View style={styles.tableHeaderRow}>
                                            <Text style={[styles.tableHeaderText, { flex: 2 }]} numberOfLines={1}>Subject</Text>
                                            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Score</Text>
                                            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Max</Text>
                                        </View>

                                        {r.marks.map((m: any, i: number) => (
                                            <View key={i} style={[styles.tableRow, i === r.marks.length - 1 && { borderBottomWidth: 0 }]}>
                                                <Text style={[styles.tableCell, { flex: 2, fontWeight: '500' }]} numberOfLines={1}>{m.subjectName}</Text>
                                                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: theme.colors.textPrimary, fontWeight: 'bold' }]}>
                                                    {m.score !== null && m.score !== undefined ? m.score : '-'}
                                                </Text>
                                                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: theme.colors.textSecondary }]}>
                                                    {m.maxScore}
                                                </Text>
                                            </View>
                                        ))}

                                        <View style={styles.tableFooterRow}>
                                            <Text style={[styles.tableFooterText, { flex: 2 }]}>Total</Text>
                                            <Text style={[styles.tableFooterText, { flex: 1, textAlign: 'center', color: theme.colors.primary }]}>
                                                {r.marks.reduce((sum: number, m: any) => sum + (Number(m.score) || 0), 0)}
                                            </Text>
                                            <Text style={[styles.tableFooterText, { flex: 1, textAlign: 'center' }]}>
                                                {r.marks.reduce((sum: number, m: any) => sum + (Number(m.maxScore) || 0), 0)}
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.tableContainer}>
                                        <Text style={styles.infoBox}>Overall Score: {r.marks !== null && r.marks !== undefined ? String(r.marks) : 'N/A'}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Report Card Quick Access — school only */}
                {user?.entityType !== 'gym' && (
                    <TouchableOpacity
                        style={{
                            backgroundColor: theme.colors.surface,
                            borderRadius: 16,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: theme.colors.primary + '40',
                            ...theme.shadows.sm
                        }}
                        onPress={() => navigation.navigate('ReportCard', { member })}
                    >
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                            <Ionicons name="ribbon-outline" size={24} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary }}>View Report Card</Text>
                            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 }}>Full academic performance & PDF export</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                )}

                {/* Payment History Header */}
                {user?.role !== 'teacher' && (
                    <View style={styles.paymentSectionHeader}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="receipt-outline" size={20} color={theme.colors.textPrimary} />
                            <Text style={styles.sectionTitle}>Payment History</Text>
                        </View>

                        {user?.role !== 'parent' && (
                            <TouchableOpacity style={styles.collectButton} onPress={handleOpenFeeModal}>
                                <Ionicons name="add" size={16} color={theme.colors.surface} />
                                <Text style={styles.collectButtonText}>Collect</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Hold History Section */}
                {holdHistory.length > 0 && (
                    <View style={styles.glassCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="time-outline" size={20} color="#D97706" />
                            <Text style={styles.sectionTitle}>Hold History</Text>
                        </View>
                        {holdHistory.map((h, i) => {
                            const days = Math.round((h.resumeDate.getTime() - h.holdDate.getTime()) / 86400000);
                            return (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < holdHistory.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border }}>
                                    <Ionicons name="pause-circle-outline" size={18} color="#D97706" style={{ marginRight: 10 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>
                                            {h.holdDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} → {h.resumeDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>{days} day{days !== 1 ? 's' : ''} on hold</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [Platform.OS === 'ios' ? 220 : 180, Platform.OS === 'ios' ? 100 : 80],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const headerTitleOpacity = scrollY.interpolate({
        inputRange: [60, 100],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={globalStyles.container}>
            {/* Animated Sticky Header */}
            <Animated.View style={[styles.animatedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={theme.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Animated.Text style={[styles.stickyTitle, { opacity: headerTitleOpacity }]}>
                        {member.firstName} {member.lastName}
                    </Animated.Text>

                    {user?.role !== 'parent' && (
                        <View style={styles.headerActionsWrapper}>
                            <TouchableOpacity onPress={handleUpdateMember} style={styles.actionIcon}>
                                <Ionicons name="pencil" size={18} color={theme.colors.primary} />
                            </TouchableOpacity>
                            {memberStatus === 'active' ? (
                                <TouchableOpacity onPress={handleHold} style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]} disabled={isHoldSubmitting}>
                                    <Ionicons name="pause-circle" size={18} color="#D97706" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => setResumeModalVisible(true)} style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]} disabled={isHoldSubmitting}>
                                    <Ionicons name="play-circle" size={18} color={theme.colors.success} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleDeleteMember} style={styles.actionIcon}>
                                <Ionicons name="trash" size={18} color={theme.colors.danger} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.avatarBorder}>
                        <View style={styles.avatarInner}>
                            <Text style={styles.avatarText}>{member.firstName.charAt(0)}{member.lastName.charAt(0)}</Text>
                        </View>
                    </View>
                    <Text style={styles.heroTitle}>{member.firstName} {member.lastName}</Text>
                    {memberStatus === 'on_hold' ? (
                        <View style={{ alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251,191,36,0.25)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4, borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)' }}>
                                <Ionicons name="pause-circle" size={14} color="#FCD34D" style={{ marginRight: 4 }} />
                                <Text style={{ color: '#FCD34D', fontWeight: '700', fontSize: 13 }}>On Hold</Text>
                                {holdStartDate && (
                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginLeft: 6 }}>
                                        {Math.floor((Date.now() - holdStartDate.getTime()) / 86400000)}d
                                    </Text>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52,211,153,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4, borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)' }}>
                                <Ionicons name="checkmark-circle" size={14} color="#6EE7B7" style={{ marginRight: 4 }} />
                                <Text style={{ color: '#6EE7B7', fontWeight: '700', fontSize: 13 }}>Active</Text>
                            </View>
                        </View>
                    )}
                    {user?.entityType !== 'gym' && (
                        <Text style={styles.heroSubtitle}>Roll No: {member.knownId}</Text>
                    )}
                </Animated.View>
            </Animated.View>

            <View style={styles.listWrapper}>
                {loading ? (
                    <View style={[globalStyles.centerMode, { marginTop: 40 }]}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <Animated.FlatList
                        data={user?.role === 'teacher' ? [] : payments}
                        keyExtractor={(item: any) => item._id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                        scrollEventThrottle={16}
                        ListHeaderComponent={renderHeader()}
                        ListEmptyComponent={
                            user?.role !== 'teacher' ? (
                                <View style={styles.emptyCardBox}>
                                    <Ionicons name="receipt-outline" size={32} color={theme.colors.border} />
                                    <Text style={[globalStyles.emptyText, { marginTop: 8 }]}>No payment records found.</Text>
                                </View>
                            ) : null
                        }
                        renderItem={({ item }) => (
                            <View style={styles.paymentCard}>
                                <View style={styles.paymentIcon}>
                                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                                </View>
                                <View style={styles.paymentInfo}>
                                    <Text style={styles.paymentAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.paymentDate}>{new Date(item.paymentDate).toLocaleDateString()}</Text>
                                        {item.receiptNo ? <Text style={[styles.paymentDate, { marginLeft: 8, fontWeight: 'bold' }]}>#{item.receiptNo}</Text> : null}
                                    </View>
                                    {item.notes ? (
                                        <Text style={styles.notesText}>{item.notes}</Text>
                                    ) : null}
                                </View>
                                {user?.role !== 'parent' && (
                                    <TouchableOpacity 
                                        style={styles.printIconButton} 
                                        onPress={() => handlePrintPastInvoice(item)}
                                    >
                                        <Ionicons name="print-outline" size={20} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    />
                )}
            </View>

            {/* Resume Member Modal */}
            <Modal animationType="slide" transparent={true} visible={resumeModalVisible} onRequestClose={() => setResumeModalVisible(false)}>
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <View>
                                <Text style={globalStyles.modalTitle}>Resume Member</Text>
                                <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 }}>Optionally collect a re-join payment</Text>
                            </View>
                            <TouchableOpacity onPress={() => setResumeModalVisible(false)} style={[globalStyles.closeButton, { alignSelf: 'flex-start' }]}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
                            <Text style={globalStyles.label}>Amount Collected (₹)</Text>
                            <TextInput
                                style={globalStyles.input}
                                placeholder="0 — leave empty to skip payment"
                                keyboardType="numeric"
                                value={resumeAmount}
                                onChangeText={setResumeAmount}
                                placeholderTextColor={theme.colors.textMuted}
                            />

                            {Number(resumeAmount) > 0 && (
                                <>
                                    <Text style={globalStyles.label}>Payment Method</Text>
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                        {['cash', 'upi', 'card'].map(m => (
                                            <TouchableOpacity
                                                key={m}
                                                style={[styles.pill, resumeMethod === m && styles.pillActive]}
                                                onPress={() => setResumeMethod(m)}
                                            >
                                                <Text style={[styles.pillText, resumeMethod === m && styles.pillTextActive]}>{m.toUpperCase()}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={globalStyles.label}>Next Renewal Date</Text>
                                    {Platform.OS === 'web' ? (
                                        <TextInput
                                            style={globalStyles.input}
                                            placeholder="YYYY-MM-DD"
                                            value={resumeDateStr}
                                            onChangeText={(val) => {
                                                setResumeDateStr(val);
                                                const d = new Date(val);
                                                if (!isNaN(d.getTime())) setResumeDate(d);
                                            }}
                                            {...{ type: 'date' } as any}
                                            placeholderTextColor={theme.colors.textMuted}
                                        />
                                    ) : (
                                        <>
                                            <TouchableOpacity
                                                style={[globalStyles.input, { justifyContent: 'center' }]}
                                                onPress={() => setShowResumePicker(true)}
                                            >
                                                <Text style={{ color: resumeDate ? theme.colors.textPrimary : theme.colors.textMuted }}>
                                                    {resumeDate ? resumeDate.toISOString().split('T')[0] : 'Select Renewal Date'}
                                                </Text>
                                            </TouchableOpacity>
                                            {showResumePicker && (
                                                <DateTimePicker
                                                    value={resumeDate || new Date()}
                                                    mode="date"
                                                    display="default"
                                                    onChange={(event, selectedDate) => {
                                                        setShowResumePicker(Platform.OS === 'ios');
                                                        if (selectedDate) {
                                                            setResumeDate(selectedDate);
                                                            setResumeDateStr(selectedDate.toISOString().split('T')[0]);
                                                        }
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={[globalStyles.submitButton, { marginTop: 16, backgroundColor: theme.colors.success }, isHoldSubmitting && globalStyles.disabledButton]}
                            onPress={handleResume}
                            disabled={isHoldSubmitting}
                        >
                            {isHoldSubmitting
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={globalStyles.submitButtonText}>
                                    {Number(resumeAmount) > 0 ? 'Resume & Collect Payment' : 'Resume Membership'}
                                  </Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Collect Fee Modal */}
            <Modal animationType="slide" transparent={true} visible={feeModalVisible} onRequestClose={() => setFeeModalVisible(false)}>
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <View>
                                <Text style={globalStyles.modalTitle}>Collect Fee</Text>
                            </View>
                            <TouchableOpacity onPress={() => setFeeModalVisible(false)} style={[globalStyles.closeButton, { alignSelf: 'flex-start' }]}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
                            {user?.entityType === 'gym' && (
                                <View style={{ marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                                    <Text style={[globalStyles.label, { marginBottom: 8 }]}>Active Subscriptions (Tap to update level)</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {allFeeStructures.filter(s => !s.feeGroupId).map(s => {
                                            const isActive = activeAddons.includes(s._id);
                                            return (
                                                <TouchableOpacity 
                                                    key={s._id}
                                                    style={[styles.pill, isActive && styles.pillActive]}
                                                    onPress={() => {
                                                        const newAddons = isActive ? activeAddons.filter(id => id !== s._id) : [...activeAddons, s._id];
                                                        setActiveAddons(newAddons);
                                                        setCartPayments(prev => ({
                                                            ...prev,
                                                            [s._id]: { ...prev[s._id], checked: !isActive }
                                                        }));
                                                    }}
                                                >
                                                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{s.name}</Text>
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </View>
                                </View>
                            )}

                            {(user?.entityType === 'gym' ? allFeeStructures.filter(s => activeAddons.includes(s._id)) : feeStructures).map(s => {
                                const cartItem = cartPayments[s._id];
                                if (!cartItem) return null;
                                return (
                                    <View key={s._id} style={{ marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: cartItem.checked ? 12 : 0 }}>
                                            <TouchableOpacity onPress={() => setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], checked: !cartItem.checked } }))}>
                                                <Ionicons name={cartItem.checked ? "checkbox" : "square-outline"} size={24} color={cartItem.checked ? theme.colors.primary : theme.colors.textMuted} />
                                            </TouchableOpacity>
                                            <Text style={{ fontWeight: 'bold', color: theme.colors.textPrimary, marginLeft: 8, flex: 1 }}>
                                                {s.name}
                                                <Text style={{ fontWeight: '500', color: theme.colors.textSecondary }}> · {FREQUENCY_LABELS[s.frequency] || s.frequency}</Text>
                                            </Text>
                                        </View>
                                        
                                        {cartItem.checked && (
                                            <>
                                                <Text style={globalStyles.label}>Amount (₹)</Text>
                                                <TextInput style={globalStyles.input} keyboardType="numeric" value={cartItem.amount} onChangeText={(val) => setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], amount: val } }))} />

                                                <Text style={globalStyles.label}>Next Renewal Date</Text>
                                                {s.frequency === 'one-time' ? (
                                                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 12 }}>One-time fee — no renewal date required</Text>
                                                ) : !cartItem.isOverriding ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                                        <View style={{ flex: 1, backgroundColor: theme.colors.primaryLight + '15', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: theme.colors.primaryLight + '40' }}>
                                                            <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 15 }}>
                                                                {cartItem.nextPaymentDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </Text>
                                                            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                                                                {cartItem.baseDate
                                                                    ? `Last payment: ${new Date(cartItem.baseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} + ${FREQUENCY_LABELS[s.frequency] || s.frequency}`
                                                                    : `Today + ${FREQUENCY_LABELS[s.frequency] || s.frequency} (first payment)`}
                                                            </Text>
                                                        </View>
                                                        <TouchableOpacity
                                                            style={{ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.primary + '50' }}
                                                            onPress={() => setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], isOverriding: true, showPicker: Platform.OS !== 'web' } }))}
                                                        >
                                                            <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>Change</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <>
                                                        {Platform.OS === 'web' ? (
                                                            <TextInput style={globalStyles.input} placeholder="YYYY-MM-DD" value={cartItem.nextPaymentDateStr} onChangeText={(val) => {
                                                                const d = new Date(val);
                                                                setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], nextPaymentDateStr: val, nextPaymentDate: !isNaN(d.getTime()) ? d : prev[s._id].nextPaymentDate } }));
                                                            }} {...{ type: 'date' } as any} />
                                                        ) : (
                                                            <>
                                                                <TouchableOpacity style={[globalStyles.input, { justifyContent: 'center' }]} onPress={() => setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], showPicker: true } }))}>
                                                                    <Text style={{ color: cartItem.nextPaymentDate ? theme.colors.textPrimary : theme.colors.textMuted }}>
                                                                        {cartItem.nextPaymentDate ? cartItem.nextPaymentDate.toISOString().split('T')[0] : 'Select Renewal Date'}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                                {cartItem.showPicker && (
                                                                    <DateTimePicker
                                                                        value={cartItem.nextPaymentDate || new Date()}
                                                                        mode="date"
                                                                        display="default"
                                                                        onChange={(event, selectedDate) => {
                                                                            setCartPayments(prev => {
                                                                                const ns = { ...prev };
                                                                                ns[s._id].showPicker = Platform.OS === 'ios';
                                                                                if (selectedDate) ns[s._id].nextPaymentDate = selectedDate;
                                                                                return ns;
                                                                            });
                                                                        }}
                                                                    />
                                                                )}
                                                            </>
                                                        )}
                                                        <TouchableOpacity style={{ marginBottom: 8 }} onPress={() => {
                                                            const autoDate = cartItem.autoNextDate;
                                                            if (!autoDate) return;
                                                            const tzOffset = new Date().getTimezoneOffset() * 60000;
                                                            const localISOTime = new Date(autoDate.getTime() - tzOffset).toISOString().slice(0, 10);
                                                            setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], isOverriding: false, showPicker: false, nextPaymentDate: autoDate, nextPaymentDateStr: localISOTime } }));
                                                        }}>
                                                            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>↩ Reset to auto-calculated date</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                                
                                                <Text style={globalStyles.label}>Notes</Text>
                                                <TextInput style={globalStyles.input} placeholder="Payment notes..." value={cartItem.notes} onChangeText={(val) => setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], notes: val } }))} />
                                            </>
                                        )}
                                    </View>
                                )
                            })}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 16 }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Total Selected:</Text>
                            <Text style={{ fontWeight: 'bold', fontSize: 20, color: theme.colors.success }}>
                                ₹{(user?.entityType === 'gym' ? allFeeStructures.filter(s => activeAddons.includes(s._id)) : feeStructures).filter(s => cartPayments[s._id]?.checked).reduce((sum, s) => sum + parseFloat(cartPayments[s._id]?.amount || '0'), 0).toLocaleString('en-IN')}
                            </Text>
                        </View>

                        <TouchableOpacity style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]} onPress={handleCollectFee} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>Confirm Payment</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Payment Success Modal */}
            <Modal animationType="fade" transparent={true} visible={!!successModalData} onRequestClose={() => setSuccessModalData(null)}>
                <View style={globalStyles.modalOverlay}>
                    <View style={[globalStyles.modalContent, { alignItems: 'center', paddingVertical: 32 }]}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.success + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 8 }}>Payment Successful!</Text>
                        <Text style={{ fontSize: 16, color: theme.colors.textSecondary, marginBottom: 24 }}>Amount: ₹{successModalData?.totalPaid}  |  #{successModalData?.receiptNo}</Text>

                        <View style={{ width: '100%', gap: 12 }}>
                            <TouchableOpacity style={[globalStyles.submitButton, { backgroundColor: theme.colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]} onPress={() => {
                                generateAndShareInvoice(successModalData);
                            }}>
                                <Ionicons name="print-outline" size={20} color={theme.colors.surface} />
                                <Text style={globalStyles.submitButtonText}>Print / Save Receipt</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[globalStyles.submitButton, { backgroundColor: '#25D366', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]} onPress={() => {
                                const msg = `Hello ${successModalData?.member?.name},\nYour payment of ₹${successModalData?.totalPaid} for ${successModalData?.gymName} is successful. Receipt No: ${successModalData?.receiptNo}. Thank you!`;
                                Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {
                                    alert('WhatsApp is not installed on your device.');
                                });
                            }}>
                                <Ionicons name="logo-whatsapp" size={20} color={theme.colors.surface} />
                                <Text style={globalStyles.submitButtonText}>Share via WhatsApp</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[globalStyles.submitButton, { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border }]} onPress={() => setSuccessModalData(null)}>
                                <Text style={[globalStyles.submitButtonText, { color: theme.colors.textPrimary }]}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    animatedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: 'hidden',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        ...theme.shadows.sm,
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.l,
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
        height: Platform.OS === 'ios' ? 100 : 80,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    headerActionsWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: theme.borderRadius.round,
        padding: 4,
    },
    stickyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.surface,
        flex: 1,
        textAlign: 'center',
        marginLeft: 16,
    },
    heroContent: {
        alignItems: 'center',
        position: 'absolute',
        top: Platform.OS === 'ios' ? 90 : 70,
        left: 0,
        right: 0,
    },
    avatarBorder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatarInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
        letterSpacing: 1,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.surface,
        letterSpacing: 0.5,
    },
    heroSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
        fontWeight: '500',
    },
    listWrapper: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: 40,
        paddingTop: Platform.OS === 'ios' ? 240 : 200,
    },
    contentContainer: {
        gap: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    glassCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '50',
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 16,
        marginBottom: 12,
    },
    detailItem: {
        width: '50%',
        paddingRight: 8,
    },
    fullWidthDetail: {
        width: '100%',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 4,
        fontWeight: '600'
    },
    detailValue: {
        fontSize: 15,
        color: theme.colors.textPrimary,
        fontWeight: '500'
    },
    parentsSection: {
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border + '50',
    },
    parentsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginBottom: 12,
    },
    feeStatsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    feeStatBox: {
        flex: 1,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    feeStatLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 4,
    },
    feeStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    examResultCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.s,
        padding: theme.spacing.s,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    examHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    examName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    examRemarks: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.secondary,
        fontStyle: 'italic',
        backgroundColor: theme.colors.secondary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.s,
    },
    tableContainer: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.s,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primaryLight + '15',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    tableHeaderText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        textTransform: 'uppercase'
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '50'
    },
    tableCell: {
        fontSize: 14,
        color: theme.colors.textSecondary
    },
    tableFooterRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border
    },
    tableFooterText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textPrimary
    },
    infoBox: {
        padding: 12,
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
    paymentSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xs,
        marginTop: theme.spacing.m,
        marginBottom: 4,
    },
    collectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.round,
        gap: 4,
        ...theme.shadows.sm,
    },
    collectButtonText: {
        color: theme.colors.surface,
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase'
    },
    paymentCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.s,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    paymentIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.success + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    paymentInfo: {
        flex: 1,
    },
    paymentAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    paymentDate: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    printIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    notesText: {
        fontSize: 13,
        color: theme.colors.textMuted,
        fontStyle: 'italic',
        backgroundColor: theme.colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.s,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    emptyCardBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginHorizontal: theme.spacing.xs,
    },
    mockPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, marginBottom: 16 },
    pill: {
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: theme.borderRadius.round,
        borderWidth: 1, borderColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },
    pillActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '15'
    },
    pillText: { color: theme.colors.textSecondary, fontWeight: '500', fontSize: 13 },
    pillTextActive: { color: theme.colors.primary, fontWeight: 'bold' }
});
