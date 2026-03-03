import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function FeeGroupsScreen() {
    const navigation = useNavigation<any>();
    const [groupsList, setGroupsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchGroups = async () => {
        try {
            const response = await api.get('/fee-groups');
            setGroupsList(response.data);
        } catch (error: any) {
            console.error(error.response?.data);
            Alert.alert('Error', 'Failed to fetch fee groups');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchGroups();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchGroups();
    };

    const handleAddGroup = async () => {
        if (!newName) {
            Alert.alert('Validation Error', 'Group name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/fee-groups', {
                name: newName,
                description: newDescription
            });
            fetchGroups();
            setModalVisible(false);

            setNewName('');
            setNewDescription('');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to create fee group';
            Alert.alert('Error', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderGroupItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={globalStyles.card} onPress={() => navigation.navigate('FeeGroupDetails', { group: item })}>
            <View style={styles.cardInfo}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupParams}>{item.description || 'No description'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.border} />
        </TouchableOpacity>
    );

    return (
        <View style={globalStyles.container}>
            {loading ? (
                <View style={globalStyles.centerMode}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={groupsList}
                    keyExtractor={(item) => item._id}
                    renderItem={renderGroupItem}
                    contentContainerStyle={globalStyles.listContainer}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <Text style={globalStyles.emptyText}>No fee groups found.</Text>
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
                            <Text style={globalStyles.modalTitle}>Add Fee Group</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Group Name</Text>
                        <TextInput style={globalStyles.input} placeholder="e.g. Grade 10" value={newName} onChangeText={setNewName} />

                        <Text style={globalStyles.label}>Description</Text>
                        <TextInput style={globalStyles.input} placeholder="e.g. Senior Year Classes" value={newDescription} onChangeText={setNewDescription} />

                        <TouchableOpacity style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]} onPress={handleAddGroup} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>Create Group</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    cardInfo: { flex: 1 },
    groupName: { fontSize: 16, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 4 },
    groupParams: { fontSize: 14, color: theme.colors.textSecondary },
});
