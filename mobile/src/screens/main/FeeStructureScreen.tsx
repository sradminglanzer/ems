import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export default function FeeStructureScreen() {
    const [structures, setStructures] = useState<any[]>([]);
    const [groupsList, setGroupsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState('monthly');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const [structRes, groupRes] = await Promise.all([
                api.get('/fee-structures'),
                api.get('/fee-groups')
            ]);
            setStructures(structRes.data);
            setGroupsList(groupRes.data);
            if (groupRes.data.length > 0) setSelectedGroup(groupRes.data[0]._id);
        } catch (error: any) {
            Alert.alert('Error', 'Failed to fetch fee data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleCreate = async () => {
        if (!name || !amount || !selectedGroup) {
            Alert.alert('Validation Error', 'All fields are required');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/fee-structures', {
                name,
                amount: Number(amount),
                frequency,
                feeGroupId: selectedGroup
            });
            fetchData();
            setModalVisible(false);
            setName('');
            setAmount('');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create fee structure');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={globalStyles.card}>
            <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.details}>Group: {item.groupDetails?.name || 'Unknown'}</Text>
                <Text style={styles.frequency}>{item.frequency.toUpperCase()}</Text>
            </View>
            <View style={styles.amountBadge}>
                <Text style={styles.amountText}>₹{item.amount}</Text>
            </View>
        </View>
    );

    return (
        <View style={globalStyles.container}>
            {loading ? (
                <View style={globalStyles.centerMode}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={structures}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={globalStyles.listContainer}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <Text style={globalStyles.emptyText}>No fee structures created yet.</Text>
                    }
                />
            )}

            <TouchableOpacity style={globalStyles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
                <Ionicons name="add" size={32} color={theme.colors.surface} />
            </TouchableOpacity>

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Create Fee</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Fee Name</Text>
                        <TextInput style={globalStyles.input} placeholder="e.g. Tuition Fee" value={name} onChangeText={setName} placeholderTextColor={theme.colors.textMuted} />

                        <Text style={globalStyles.label}>Amount (₹)</Text>
                        <TextInput style={globalStyles.input} placeholder="5000" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholderTextColor={theme.colors.textMuted} />

                        {groupsList.length > 0 && (
                            <>
                                <Text style={globalStyles.label}>Assign to Fee Group</Text>
                                <View style={styles.mockPicker}>
                                    {groupsList.map(g => (
                                        <TouchableOpacity
                                            key={g._id}
                                            style={[styles.pill, selectedGroup === g._id && styles.pillActive]}
                                            onPress={() => setSelectedGroup(g._id)}
                                        >
                                            <Text style={[styles.pillText, selectedGroup === g._id && styles.pillTextActive]}>{g.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <Text style={globalStyles.label}>Frequency</Text>
                        <View style={styles.mockPicker}>
                            {['monthly', 'term', 'annual', 'one-time'].map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.pill, frequency === f && styles.pillActive]}
                                    onPress={() => setFrequency(f)}
                                >
                                    <Text style={[styles.pillText, frequency === f && styles.pillTextActive]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]} onPress={handleCreate} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color={theme.colors.surface} /> : <Text style={globalStyles.submitButtonText}>Create Structure</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    cardInfo: { flex: 1 },
    name: { fontSize: 16, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 4 },
    details: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 4 },
    frequency: { fontSize: 12, color: theme.colors.textMuted, textTransform: 'uppercase', fontWeight: '500' },
    amountBadge: { backgroundColor: theme.colors.primaryLight + '20', paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.borderRadius.round },
    amountText: { color: theme.colors.primary, fontSize: 16, fontWeight: '600' },
    mockPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s, marginBottom: theme.spacing.l },
    pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.borderRadius.round, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
    pillActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' },
    pillText: { color: theme.colors.textSecondary, fontWeight: '500' },
    pillTextActive: { color: theme.colors.primary, fontWeight: '600' },
});
