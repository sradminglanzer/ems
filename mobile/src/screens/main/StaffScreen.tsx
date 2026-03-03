import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export default function StaffScreen() {
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newContact, setNewContact] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'staff' | 'teacher'>('staff');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchStaff = async () => {
        try {
            const response = await api.get('/users');
            setStaffList(response.data);
        } catch (error: any) {
            console.error(error.response?.data);
            Alert.alert('Error', 'Failed to fetch staff list');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStaff();
    };

    const handleAddStaff = async () => {
        if (!newName || !newContact) {
            Alert.alert('Validation Error', 'Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post('/users', {
                name: newName,
                contactNumber: newContact,
                role: newRole
            });
            // If success, refresh list and close modal
            fetchStaff();
            setModalVisible(false);

            // clear form
            setNewName('');
            setNewContact('');
            setNewRole('staff');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to create user';
            Platform.OS === 'web' ? alert(message) : Alert.alert('Error', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteStaff = (id: string) => {
        const executeDelete = async () => {
            try {
                await api.delete(`/users/${id}`);
                fetchStaff();
            } catch (error: any) {
                const message = error.response?.data?.message || 'Failed to delete user';
                Platform.OS === 'web' ? alert(message) : Alert.alert('Error', message);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to completely remove this staff member?")) {
                executeDelete();
            }
        } else {
            Alert.alert(
                "Delete Staff",
                "Are you sure you want to completely remove this staff member?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: executeDelete }
                ]
            );
        }
    };

    const renderStaffItem = ({ item }: { item: any }) => (
        <View style={globalStyles.card}>
            <View style={styles.cardInfo}>
                <Text style={styles.staffName}>{item.name}</Text>
                <Text style={styles.staffContact}>{item.contactNumber}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.badgeContainer}>
                    <Text style={styles.roleBadge}>{item.role}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteStaff(item._id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={24} color={theme.colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={globalStyles.container}>
            {loading ? (
                <View style={globalStyles.centerMode}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={staffList}
                    keyExtractor={(item) => item._id}
                    renderItem={renderStaffItem}
                    contentContainerStyle={globalStyles.listContainer}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <Text style={globalStyles.emptyText}>No staff members found.</Text>
                    }
                />
            )}

            <TouchableOpacity
                style={globalStyles.fab}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={32} color={theme.colors.surface} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={globalStyles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Add New Staff</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Full Name</Text>
                        <TextInput
                            style={globalStyles.input}
                            placeholder="John Doe"
                            value={newName}
                            onChangeText={setNewName}
                        />

                        <Text style={globalStyles.label}>Contact Number</Text>
                        <TextInput
                            style={globalStyles.input}
                            placeholder="9876543210"
                            keyboardType="phone-pad"
                            value={newContact}
                            onChangeText={setNewContact}
                        />

                        <Text style={globalStyles.label}>Assign Role</Text>
                        <View style={styles.roleContainer}>
                            {['admin', 'staff', 'teacher'].map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.roleOption, newRole === r && styles.roleOptionSelected]}
                                    onPress={() => setNewRole(r as any)}
                                >
                                    <Text style={[styles.roleOptionText, newRole === r && styles.roleOptionTextSelected]}>
                                        {r.charAt(0).toUpperCase() + r.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]}
                            onPress={handleAddStaff}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={globalStyles.submitButtonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    cardInfo: {
        flex: 1,
    },
    staffName: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    staffContact: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    badgeContainer: {
        backgroundColor: theme.colors.primaryLight + '20',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.round,
    },
    roleBadge: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    roleContainer: {
        flexDirection: 'row',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.xl,
    },
    roleOption: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    roleOptionSelected: {
        backgroundColor: theme.colors.primary + '10',
        borderColor: theme.colors.primary,
    },
    roleOptionText: {
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    roleOptionTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
});
