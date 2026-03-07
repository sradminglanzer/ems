import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert, Modal, TextInput, KeyboardAvoidingView, Animated } from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import HeaderActions from '../../components/HeaderActions';
import { LinearGradient } from 'expo-linear-gradient';

export default function FeeGroupDetailsScreen() {
    const { selectedAcademicYearId } = useContext(AuthContext);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { group } = route.params;

    const scrollY = React.useRef(new Animated.Value(0)).current;

    const [members, setMembers] = useState<any[]>([]);
    const [structures, setStructures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Promote Students Modal
    const [promoteModalVisible, setPromoteModalVisible] = useState(false);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [allGroups, setAllGroups] = useState<any[]>([]);
    const [selectedTargetYearId, setSelectedTargetYearId] = useState<string>('');
    const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<string>('');
    const [isPromoting, setIsPromoting] = useState(false);

    // Fee Structure Modal
    const [feeModalVisible, setFeeModalVisible] = useState(false);
    const [feeName, setFeeName] = useState('');
    const [feeAmount, setFeeAmount] = useState('');
    const [feeFrequency, setFeeFrequency] = useState('monthly');
    const [isStructureSubmitting, setIsStructureSubmitting] = useState(false);

    // Edit Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState(group.name);
    const [newDescription, setNewDescription] = useState(group.description || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Track current group strictly
    const [currentGroupData, setCurrentGroupData] = useState(group);

    const loadGroupMembers = async () => {
        try {
            // Re-fetch group to get latest members array
            const groupResp = await api.get('/fee-groups');
            const currentGroup = groupResp.data.find((g: any) => g._id === group._id);

            if (currentGroup) {
                setCurrentGroupData(currentGroup);
                let currentRosterMembers: string[] = [];
                if (currentGroup.yearlyRosters && Array.isArray(currentGroup.yearlyRosters)) {
                    const roster = currentGroup.yearlyRosters.find((r: any) => r.academicYearId === selectedAcademicYearId);
                    if (roster && roster.members) {
                        currentRosterMembers = roster.members;
                    }
                }

                if (currentRosterMembers.length > 0) {
                    // Fetch all members
                    const membersResp = await api.get('/members');
                    const matchedMembers = membersResp.data.filter((m: any) => currentRosterMembers.includes(m._id));
                    setMembers(matchedMembers);
                } else {
                    setMembers([]);
                }
            }

            // Fetch fee structures for this group
            const structResp = await api.get('/fee-structures');
            const matchedStructs = structResp.data.filter((s: any) => s.feeGroupId === group._id);
            setStructures(matchedStructs);

            // Fetch dropdown data for promotion
            const [yearsResp, groupsResp] = await Promise.all([
                api.get('/academic-years'),
                api.get('/fee-groups')
            ]);
            setAcademicYears(yearsResp.data.filter((y: any) => y._id !== selectedAcademicYearId));
            setAllGroups(groupsResp.data);

        } catch (error) {
            console.error('Error loading members or structures:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadGroupMembers();
        }, [selectedAcademicYearId])
    );

    const handleUpdateGroup = async () => {
        if (!newName) return alert('Name is required');
        setIsSubmitting(true);
        try {
            await api.put(`/fee-groups/${group._id}`, { name: newName, description: newDescription });
            setModalVisible(false);
            loadGroupMembers();
        } catch (e) {
            alert('Error updating group');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteGroup = () => {
        Alert.alert("Delete Group", "Are you sure you want to delete this class group?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    try {
                        await api.delete(`/fee-groups/${group._id}`);
                        navigation.goBack();
                    } catch (e) {
                        alert('Error deleting group');
                    }
                }
            }
        ]);
    };

    const handlePromoteStudents = async () => {
        if (!selectedTargetYearId || !selectedTargetGroupId) {
            Alert.alert('Validation Error', 'Please select both a target year and target group.');
            return;
        }

        if (members.length === 0) {
            Alert.alert('No Students', 'There are no students to promote from this class year.');
            return;
        }

        setIsPromoting(true);
        try {
            // Get the target group
            const targetGroup = allGroups.find(g => g._id === selectedTargetGroupId);
            if (!targetGroup) throw new Error('Target group not found');

            // Find its existing roster for the target year
            let existingTargetMembers: string[] = [];
            if (targetGroup.yearlyRosters && Array.isArray(targetGroup.yearlyRosters)) {
                const roster = targetGroup.yearlyRosters.find((r: any) => r.academicYearId === selectedTargetYearId);
                if (roster && roster.members) {
                    existingTargetMembers = roster.members;
                }
            }

            // Extract the IDs of the current members we want to promote
            const currentMemberIdsToPromote = members.map(m => m._id);

            // Merge arrays uniquely
            const mergedMembersSet = new Set([...existingTargetMembers, ...currentMemberIdsToPromote]);
            const nextYearMembers = Array.from(mergedMembersSet);

            // Put the update
            await api.put(`/fee-groups/${selectedTargetGroupId}`, {
                academicYearId: selectedTargetYearId,
                members: nextYearMembers
            });

            Alert.alert('Success', `Successfully promoted ${currentMemberIdsToPromote.length} students.`);
            setPromoteModalVisible(false);
            setSelectedTargetYearId('');
            setSelectedTargetGroupId('');

        } catch (error: any) {
            console.error('Promotion error:', error);
            Alert.alert('Error', 'Failed to promote students.');
        } finally {
            setIsPromoting(false);
        }
    };

    const handleCreateFeeStructure = async () => {
        if (!feeName || !feeAmount) return alert('Name and Amount are required');
        setIsStructureSubmitting(true);
        try {
            await api.post('/fee-structures', {
                feeGroupId: group._id,
                name: feeName,
                amount: parseFloat(feeAmount),
                frequency: feeFrequency
            });
            setFeeModalVisible(false);
            setFeeName('');
            setFeeAmount('');
            loadGroupMembers();
        } catch (e) {
            alert('Error creating fee structure');
        } finally {
            setIsStructureSubmitting(false);
        }
    };

    const renderMember = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.memberCard} activeOpacity={0.8} onPress={() => navigation.navigate('MemberDetails', { member: item })}>
            <LinearGradient
                colors={theme.gradients.primary}
                style={styles.memberAvatarContainer}
            >
                <Text style={styles.memberAvatarText}>
                    {item.firstName.charAt(0)}{item.lastName.charAt(0)}
                </Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.details}>Roll No: {item.knownId}</Text>
                {item.contact && <Text style={styles.details}>Contact: {item.contact}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.border} />
        </TouchableOpacity>
    );

    const totalFees = structures.reduce((sum, s) => sum + s.amount, 0);

    const renderHeader = () => (
        <View style={styles.statsContainer}>
            <View style={styles.statCardsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Students Enrolled</Text>
                    <Text style={styles.statValue}>{members.length}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Fees Generated</Text>
                    <Text style={[styles.statValue, { color: theme.colors.primary }]}>₹{totalFees.toLocaleString('en-IN')}</Text>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
                {members.length > 0 && (
                    <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => setPromoteModalVisible(true)} activeOpacity={0.8}>
                        <Ionicons name="arrow-up-circle" size={20} color={theme.colors.surface} />
                        <Text style={styles.actionButtonPrimaryText}>Promote Students</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Fee Structures */}
            <View style={styles.feeSectionHeader}>
                <Text style={styles.sectionTitle}>Fee Structures</Text>
                <TouchableOpacity onPress={() => setFeeModalVisible(true)} style={styles.addIconSmall}>
                    <Ionicons name="add" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {structures.length > 0 ? (
                structures.map((s, idx) => (
                    <View key={idx} style={styles.structureCard}>
                        <View style={styles.structureInfo}>
                            <View style={styles.structureIcon}>
                                <Ionicons name="cash-outline" size={18} color={theme.colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.structureName}>{s.name}</Text>
                                <View style={styles.frequencyBadge}>
                                    <Text style={styles.frequencyText}>{s.frequency}</Text>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.structureAmount}>₹{s.amount.toLocaleString('en-IN')}</Text>
                    </View>
                ))
            ) : (
                <View style={styles.emptyCardBox}>
                    <Ionicons name="cash-outline" size={32} color={theme.colors.border} />
                    <Text style={[globalStyles.emptyText, { marginTop: 8 }]}>No fee structures defined.</Text>
                </View>
            )}

            <View style={[styles.feeSectionHeader, { marginTop: 24, marginBottom: 8 }]}>
                <Text style={styles.sectionTitle}>Enrolled Students</Text>
            </View>
        </View>
    );

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
                        {currentGroupData.name}
                    </Animated.Text>

                    <View style={styles.headerActionsWrapper}>
                        <HeaderActions />
                        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.actionIcon}>
                            <Ionicons name="pencil" size={18} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDeleteGroup} style={styles.actionIcon}>
                            <Ionicons name="trash" size={18} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.heroAvatar}>
                        <Text style={styles.heroAvatarText}>{currentGroupData.name.substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.heroTitle}>{currentGroupData.name}</Text>
                    <Text style={styles.heroSubtitle}>{currentGroupData.description || 'Academic Class Group'}</Text>
                </Animated.View>
            </Animated.View>

            <View style={styles.listWrapper}>
                {loading ? (
                    <View style={[globalStyles.centerMode, { marginTop: 40 }]}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <Animated.FlatList
                        data={members}
                        keyExtractor={(item: any) => item._id}
                        renderItem={renderMember}
                        ListHeaderComponent={renderHeader}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                        scrollEventThrottle={16}
                        ListEmptyComponent={<Text style={globalStyles.emptyText}>No students in this group.</Text>}
                    />
                )}
            </View>

            <TouchableOpacity
                style={globalStyles.fab}
                onPress={() => navigation.navigate('AddMember', { feeGroupId: group._id })}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={theme.gradients.primary}
                    style={styles.fabGradient}
                >
                    <Ionicons name="person-add" size={28} color={theme.colors.surface} />
                </LinearGradient>
            </TouchableOpacity>

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Edit Class Group</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Class Name</Text>
                        <TextInput style={globalStyles.input} value={newName} onChangeText={setNewName} />

                        <Text style={globalStyles.label}>Description</Text>
                        <TextInput style={globalStyles.input} value={newDescription} onChangeText={setNewDescription} />

                        <TouchableOpacity style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]} onPress={handleUpdateGroup} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>Update Class</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Fee Structure Modal */}
            <Modal animationType="slide" transparent={true} visible={feeModalVisible} onRequestClose={() => setFeeModalVisible(false)}>
                <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Add Fee Component</Text>
                            <TouchableOpacity onPress={() => setFeeModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Fee Name</Text>
                        <TextInput style={globalStyles.input} placeholder="e.g. Tuition Fee" value={feeName} onChangeText={setFeeName} />

                        <Text style={globalStyles.label}>Amount (₹)</Text>
                        <TextInput style={globalStyles.input} placeholder="e.g. 10000" keyboardType="numeric" value={feeAmount} onChangeText={setFeeAmount} />

                        <Text style={globalStyles.label}>Frequency</Text>
                        <View style={styles.pickerContainer}>
                            {['monthly', 'yearly', 'one-time'].map(freq => (
                                <TouchableOpacity
                                    key={freq}
                                    style={[styles.pill, feeFrequency === freq && styles.pillActive]}
                                    onPress={() => setFeeFrequency(freq)}
                                >
                                    <Text style={[styles.pillText, feeFrequency === freq && styles.pillTextActive]}>{freq}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={[globalStyles.submitButton, isStructureSubmitting && globalStyles.disabledButton]} onPress={handleCreateFeeStructure} disabled={isStructureSubmitting}>
                            {isStructureSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>Create Fee Component</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Promote Students Modal */}
            <Modal animationType="slide" transparent={true} visible={promoteModalVisible} onRequestClose={() => setPromoteModalVisible(false)}>
                <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Bulk Promote Students</Text>
                            <TouchableOpacity onPress={() => setPromoteModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16 }}>
                            This will copy all {members.length} current students from this year's roster into the target group and year you select below.
                        </Text>

                        <Text style={globalStyles.label}>Target Academic Year</Text>
                        <View style={styles.pickerContainer}>
                            {academicYears.map(y => (
                                <TouchableOpacity
                                    key={y._id}
                                    style={[styles.pill, selectedTargetYearId === y._id && styles.pillActive]}
                                    onPress={() => setSelectedTargetYearId(y._id)}
                                >
                                    <Text style={[styles.pillText, selectedTargetYearId === y._id && styles.pillTextActive]}>{y.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={globalStyles.label}>Target Class</Text>
                        <View style={styles.pickerContainer}>
                            {allGroups.map(g => (
                                <TouchableOpacity
                                    key={g._id}
                                    style={[styles.pill, selectedTargetGroupId === g._id && styles.pillActive]}
                                    onPress={() => setSelectedTargetGroupId(g._id)}
                                >
                                    <Text style={[styles.pillText, selectedTargetGroupId === g._id && styles.pillTextActive]}>{g.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={[globalStyles.submitButton, isPromoting && globalStyles.disabledButton]} onPress={handlePromoteStudents} disabled={isPromoting}>
                            {isPromoting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>Promote Students</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
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
    heroAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    heroAvatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.surface,
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
    },
    listWrapper: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: theme.spacing.m,
        paddingTop: Platform.OS === 'ios' ? 240 : 200,
        paddingBottom: 90,
    },
    statsContainer: {
        marginBottom: theme.spacing.s,
    },
    statCardsRow: {
        flexDirection: 'row',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.s,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        padding: 12,
        borderRadius: theme.borderRadius.m,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    actionsContainer: {
        marginBottom: theme.spacing.xl,
    },
    actionButtonPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.m,
        ...theme.shadows.sm,
        gap: 8,
    },
    actionButtonPrimaryText: {
        color: theme.colors.surface,
        fontWeight: 'bold',
        fontSize: 16,
    },
    feeSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    addIconSmall: {
        backgroundColor: theme.colors.primaryLight + '20',
        padding: 6,
        borderRadius: theme.borderRadius.round,
    },
    structureCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.s,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    structureInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    structureIcon: {
        backgroundColor: theme.colors.primaryLight + '15',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    structureName: {
        fontSize: 16,
        color: theme.colors.textPrimary,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    frequencyBadge: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.secondary + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.s,
    },
    frequencyText: {
        color: theme.colors.secondary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    structureAmount: {
        fontSize: 18,
        color: theme.colors.primary,
        fontWeight: 'bold'
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
        marginBottom: theme.spacing.s,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.s,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    memberAvatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    memberAvatarText: {
        color: theme.colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    name: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 4 },
    details: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 2 },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.round,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },
    pillActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10'
    },
    pillText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    pillTextActive: {
        color: theme.colors.primary,
        fontWeight: 'bold'
    },
    fabGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
