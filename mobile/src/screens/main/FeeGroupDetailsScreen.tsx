import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function FeeGroupDetailsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { group } = route.params;

    const [members, setMembers] = useState<any[]>([]);
    const [structures, setStructures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
                if (currentGroup.members?.length > 0) {
                    // Fetch all members
                    const membersResp = await api.get('/members');
                    const matchedMembers = membersResp.data.filter((m: any) => currentGroup.members.includes(m._id));
                    setMembers(matchedMembers);
                } else {
                    setMembers([]);
                }
            }

            // Fetch fee structures for this group
            const structResp = await api.get('/fee-structures');
            const matchedStructs = structResp.data.filter((s: any) => s.feeGroupId === group._id);
            setStructures(matchedStructs);

        } catch (error) {
            console.error('Error loading members or structures:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadGroupMembers();
        }, [])
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
        Alert.alert("Delete Group", "Are you sure you want to delete this fee group?", [
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

    const handleRemoveMember = (memberId: string) => {
        Alert.alert("Remove Student", "Remove student from this fee group?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Remove", style: "destructive", onPress: async () => {
                    try {
                        const updatedMembers = currentGroupData.members.filter((id: string) => id !== memberId);
                        await api.put(`/fee-groups/${group._id}`, { members: updatedMembers });
                        loadGroupMembers();
                    } catch (e) {
                        alert('Error removing student');
                    }
                }
            }
        ]);
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
        <TouchableOpacity style={globalStyles.card} onPress={() => navigation.navigate('MemberDetails', { member: item })}>
            <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.details}>Roll No: {item.knownId}</Text>
                {item.contact && <Text style={styles.details}>Contact: {item.contact}</Text>}
            </View>
            <TouchableOpacity onPress={() => handleRemoveMember(item._id)} style={styles.removeIcon}>
                <Ionicons name="close-circle" size={24} color={theme.colors.danger} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={globalStyles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{currentGroupData.name}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDeleteGroup}>
                        <Ionicons name="trash-outline" size={24} color="red" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.statsText}>{members.length} Students Enrolled</Text>
                    <Text style={styles.statsText}>Total Fees: ₹{structures.reduce((sum, s) => sum + s.amount, 0)}</Text>
                </View>

                {structures.length > 0 ? (
                    structures.map((s, idx) => (
                        <View key={idx} style={styles.structureCard}>
                            <Text style={styles.structureName}>{s.name} ({s.frequency})</Text>
                            <Text style={styles.structureAmount}>₹{s.amount}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={[globalStyles.emptyText, { marginTop: 8 }]}>No fee structures defined.</Text>
                )}

                <TouchableOpacity style={styles.addFeeButton} onPress={() => setFeeModalVisible(true)}>
                    <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.addFeeText}>Add Fee Structure</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={globalStyles.centerMode}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={members}
                    keyExtractor={(item) => item._id}
                    renderItem={renderMember}
                    contentContainerStyle={globalStyles.listContainer}
                    ListEmptyComponent={<Text style={globalStyles.emptyText}>No students in this group.</Text>}
                />
            )}

            <TouchableOpacity
                style={globalStyles.fab}
                onPress={() => navigation.navigate('AddMember', { feeGroupId: group._id })}
                activeOpacity={0.8}
            >
                <Ionicons name="person-add" size={28} color={theme.colors.surface} />
            </TouchableOpacity>

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Edit Fee Group</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Group Name</Text>
                        <TextInput style={globalStyles.input} value={newName} onChangeText={setNewName} />

                        <Text style={globalStyles.label}>Description</Text>
                        <TextInput style={globalStyles.input} value={newDescription} onChangeText={setNewDescription} />

                        <TouchableOpacity style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]} onPress={handleUpdateGroup} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>Update Group</Text>}
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

                        <TouchableOpacity style={[globalStyles.submitButton, isStructureSubmitting && globalStyles.disabledButton]} onPress={handleCreateFeeStructure} disabled={isStructureSubmitting}>
                            {isStructureSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>Create Fee</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
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
    statsContainer: {
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    statsText: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    name: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 4 },
    details: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 2 },
    removeIcon: { padding: 4 },
    structureCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.s,
        borderRadius: theme.borderRadius.s,
        marginVertical: 4
    },
    structureName: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
    structureAmount: { fontSize: 14, color: theme.colors.primary, fontWeight: 'bold' },
    addFeeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        marginTop: 8,
        backgroundColor: theme.colors.primary + '10',
        borderRadius: theme.borderRadius.s
    },
    addFeeText: { color: theme.colors.primary, fontWeight: '600', marginLeft: 8 }
});
