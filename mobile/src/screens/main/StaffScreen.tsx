import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import HeaderActions from '../../components/HeaderActions';
import { AuthContext } from '../../context/AuthContext';

export default function StaffScreen() {
    const { user } = React.useContext(AuthContext);
    const navigation = useNavigation<any>();
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

    const scrollY = useRef(new Animated.Value(0)).current;

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [Platform.OS === 'ios' ? 200 : 160, Platform.OS === 'ios' ? 100 : 80],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 60],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const headerTitleOpacity = scrollY.interpolate({
        inputRange: [40, 80],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const handleAddStaff = async () => {
        if (!newName || !newContact) {
            Alert.alert('Validation Error', 'Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/users', {
                name: newName,
                contactNumber: newContact,
                role: (newRole as any) === 'trainer' ? 'teacher' : newRole
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

    const renderStaffItem = ({ item }: { item: any }) => {
        const initials = item.name.substring(0, 2).toUpperCase();
        let roleColor = theme.colors.primary;
        let roleBg = theme.colors.primaryLight + '15';

        if (item.role === 'admin') {
            roleColor = theme.colors.danger;
            roleBg = theme.colors.dangerLight + '20';
        } else if (item.role === 'teacher') {
            roleColor = theme.colors.success;
            roleBg = '#10B98120'; // Hex opacity hack for success color
        }

        return (
            <View style={styles.staffCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={item.role === 'admin' ? theme.gradients.danger : theme.gradients.primary}
                            style={styles.avatarGradient}
                        >
                            <Text style={styles.avatarText}>{initials}</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.cardInfo}>
                        <Text style={styles.staffName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.contactRow}>
                            <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
                            <Text style={styles.staffContact}>{item.contactNumber}</Text>
                        </View>
                        <View style={[styles.badgeContainer, { backgroundColor: roleBg }]}>
                            <Text style={[styles.roleBadge, { color: roleColor }]}>{item.role === 'teacher' && user?.entityType === 'gym' ? 'trainer' : item.role}</Text>
                        </View>
                    </View>

                    {item.role !== 'owner' && (
                        <TouchableOpacity onPress={() => handleDeleteStaff(item._id)} style={styles.deleteButton} activeOpacity={0.7}>
                            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

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
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconButton}>
                        <Ionicons name="menu" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Animated.Text style={[styles.stickyTitle, { opacity: headerTitleOpacity }]}>
                        Staff Management
                    </Animated.Text>
                    <View style={styles.headerActionsWrapper}>
                        <HeaderActions />
                    </View>
                </View>
                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.heroTextContent}>
                        <Text style={styles.heroTitle}>Staff Directory</Text>
                        <Text style={styles.heroSubtitle}>{staffList.length} active members</Text>
                    </View>
                    <View style={styles.heroIconBox}>
                        <Ionicons name="people-circle" size={28} color={theme.colors.surface} />
                    </View>
                </Animated.View>
            </Animated.View>

            <View style={styles.listWrapper}>
                {loading ? (
                    <View style={globalStyles.centerMode}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <Animated.FlatList
                        data={staffList}
                        keyExtractor={(item) => item._id}
                        renderItem={renderStaffItem}
                        contentContainerStyle={styles.listContent}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        showsVerticalScrollIndicator={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                        scrollEventThrottle={16}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={64} color={theme.colors.border} />
                                <Text style={globalStyles.emptyText}>No staff members found.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <TouchableOpacity style={globalStyles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.9}>
                <LinearGradient
                    colors={theme.gradients.primary}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={32} color={theme.colors.surface} />
                </LinearGradient>
            </TouchableOpacity>

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Add New Staff</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Full Name</Text>
                        <TextInput style={globalStyles.input} placeholder="John Doe" value={newName} onChangeText={setNewName} />

                        <Text style={globalStyles.label}>Contact Number</Text>
                        <TextInput style={globalStyles.input} placeholder="9876543210" keyboardType="phone-pad" value={newContact} onChangeText={setNewContact} />

                        <Text style={globalStyles.label}>Assign Role</Text>
                        <View style={styles.roleContainer}>
                            {(user?.entityType === 'gym' ? ['admin', 'staff', 'trainer'] : ['admin', 'staff', 'teacher']).map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.roleOption, newRole === r && styles.roleOptionSelected]}
                                    onPress={() => setNewRole(r as any)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.roleOptionText, newRole === r && styles.roleOptionTextSelected]}>
                                        {r.charAt(0).toUpperCase() + r.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]} onPress={handleAddStaff} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="person-add" size={20} color={theme.colors.surface} />
                                    <Text style={globalStyles.submitButtonText}>Create Account</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View >
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
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        ...theme.shadows.lg,
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: Platform.OS === 'ios' ? 100 : 80,
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
        paddingHorizontal: theme.spacing.m,
        zIndex: 100,
    },
    headerActionsWrapper: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: theme.borderRadius.s,
        padding: 4,
    },
    iconButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    stickyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.surface,
        flex: 1,
        textAlign: 'center',
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.l,
    },
    heroTextContent: {
        flex: 1,
    },
    heroIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.surface,
        letterSpacing: 0.5,
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    listWrapper: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: theme.spacing.m,
        paddingTop: Platform.OS === 'ios' ? 220 : 180,
        paddingBottom: 120, // Extra space for FAB
    },
    staffCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: 12,
        marginBottom: theme.spacing.s,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 10,
    },
    avatarGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: 'bold',
    },
    cardInfo: {
        flex: 1,
    },
    staffName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    staffContact: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    badgeContainer: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.s,
    },
    roleBadge: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    deleteButton: {
        padding: 10,
        backgroundColor: theme.colors.dangerLight + '10',
        borderRadius: theme.borderRadius.round,
        marginLeft: theme.spacing.s,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    fabGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
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
        fontWeight: 'bold',
    },
});
