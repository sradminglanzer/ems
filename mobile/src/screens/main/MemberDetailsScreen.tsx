import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, FlatList, Platform, Modal, TextInput, Alert, Animated, ScrollView, Image
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

export default function MemberDetailsScreen() {
    const { user, selectedAcademicYearId } = useContext(AuthContext);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { member } = route.params;

    const scrollY = React.useRef(new Animated.Value(0)).current;

    const [payments, setPayments] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Collect Fee Modal Checkout Cart
    const [feeModalVisible, setFeeModalVisible] = useState(false);
    const [cartPayments, setCartPayments] = useState<Record<string, {
        amount: string,
        nextPaymentDate: Date | null,
        nextPaymentDateStr: string,
        showPicker: boolean,
        notes: string,
        checked: boolean
    }>>({});
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const calculateNextDate = (frequency: string) => {
        const d = new Date();
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
        const newCart: any = {};
        feeStructures.forEach(s => {
            const nextD = calculateNextDate(s.frequency);
            const tzOffset = new Date().getTimezoneOffset() * 60000;
            const localISOTime = new Date(nextD.getTime() - tzOffset).toISOString().slice(0, 10);
            
            newCart[s._id] = {
                amount: String(s.amount),
                nextPaymentDate: nextD,
                nextPaymentDateStr: localISOTime,
                showPicker: false,
                notes: '',
                checked: true
            };
        });
        setCartPayments(newCart);
    };

    const handleCollectFee = async () => {
        const paymentsToSubmit = feeStructures
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
            await api.post('/fee-payments', { payments: paymentsToSubmit });
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
                        {member.dob && (
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Date of Birth</Text>
                                <Text style={styles.detailValue}>{new Date(member.dob).toLocaleDateString()}</Text>
                            </View>
                        )}
                        {member.contact && (
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Contact Phone</Text>
                                <Text style={styles.detailValue}>{member.contact}</Text>
                            </View>
                        )}
                    </View>

                    {member.address && (
                        <View style={styles.fullWidthDetail}>
                            <Text style={styles.detailLabel}>Home Address</Text>
                            <Text style={styles.detailValue}>{member.address}</Text>
                        </View>
                    )}

                    {(member.fatherOccupation || member.motherOccupation) && (
                        <View style={styles.parentsSection}>
                            <Text style={styles.parentsTitle}>Parent Details</Text>
                            <View style={styles.detailsGrid}>
                                {member.fatherOccupation && !['no', 'none', 'n/a', 'na', '-', 'nil'].includes(member.fatherOccupation.toLowerCase().trim()) && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Father Occupation</Text>
                                        <Text style={styles.detailValue}>{member.fatherOccupation}</Text>
                                    </View>
                                )}
                                {member.motherOccupation && !['no', 'none', 'n/a', 'na', '-', 'nil'].includes(member.motherOccupation.toLowerCase().trim()) && (
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
                                    {r.remarks && <Text style={styles.examRemarks}>{r.remarks}</Text>}
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
                                    <Text style={styles.paymentDate}>{new Date(item.paymentDate).toLocaleDateString()}</Text>
                                    {item.notes ? (
                                        <Text style={styles.notesText}>{item.notes}</Text>
                                    ) : null}
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>

            {/* Collect Fee Modal */}
            <Modal animationType="slide" transparent={true} visible={feeModalVisible} onRequestClose={() => setFeeModalVisible(false)}>
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Collect Fee</Text>
                            <TouchableOpacity onPress={() => setFeeModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
                            {feeStructures.map(s => {
                                const cartItem = cartPayments[s._id];
                                if (!cartItem) return null;
                                return (
                                    <View key={s._id} style={{ marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: cartItem.checked ? 12 : 0 }}>
                                            <TouchableOpacity onPress={() => setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], checked: !cartItem.checked } }))}>
                                                <Ionicons name={cartItem.checked ? "checkbox" : "square-outline"} size={24} color={cartItem.checked ? theme.colors.primary : theme.colors.textMuted} />
                                            </TouchableOpacity>
                                            <Text style={{ fontWeight: 'bold', color: theme.colors.textPrimary, marginLeft: 8, flex: 1 }}>{s.name} ({s.frequency})</Text>
                                        </View>
                                        
                                        {cartItem.checked && (
                                            <>
                                                <Text style={globalStyles.label}>Amount (₹)</Text>
                                                <TextInput style={globalStyles.input} keyboardType="numeric" value={cartItem.amount} onChangeText={(val) => setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], amount: val } }))} />

                                                <Text style={globalStyles.label}>Next Renewal Date</Text>
                                                {Platform.OS === 'web' ? (
                                                    // @ts-ignore
                                                    <TextInput style={globalStyles.input} placeholder="YYYY-MM-DD" value={cartItem.nextPaymentDateStr} onChangeText={(val) => {
                                                        const d = new Date(val);
                                                        setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], nextPaymentDateStr: val, nextPaymentDate: !isNaN(d.getTime()) ? d : prev[s._id].nextPaymentDate } }));
                                                    }} type="date" />
                                                ) : (
                                                    <>
                                                        <TouchableOpacity style={[globalStyles.input, { justifyContent: 'center' }]} onPress={() => setCartPayments(prev => ({ ...prev, [s._id]: { ...prev[s._id], showPicker: true } }))}>
                                                            <Text style={{ color: cartItem.nextPaymentDate ? theme.colors.textPrimary : theme.colors.textMuted }}>
                                                                {cartItem.nextPaymentDate ? cartItem.nextPaymentDate.toISOString().split('T')[0] : "Select Renewal Date"}
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
                                ₹{feeStructures.filter(s => cartPayments[s._id]?.checked).reduce((sum, s) => sum + parseFloat(cartPayments[s._id]?.amount || '0'), 0).toLocaleString('en-IN')}
                            </Text>
                        </View>

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
