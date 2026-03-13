import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Animated
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HeaderActions from '../../components/HeaderActions';

export default function FeeStructureScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
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

    const scrollY = useRef(new Animated.Value(0)).current;

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [Platform.OS === 'ios' ? 240 : 200, Platform.OS === 'ios' ? 100 : 80],
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

    const deleteStructure = async (id: string) => {
        Alert.alert('Delete Fee Structure', 'Are you sure you want to delete this structure? This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/fee-structures/${id}`);
                        fetchData();
                    } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.message || 'Failed to delete structure');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardInfo}>
                <View style={styles.cardHeader}>
                    <Text style={styles.name}>{item.name}</Text>
                    <TouchableOpacity onPress={() => deleteStructure(item._id)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                    </TouchableOpacity>
                </View>

                <View style={styles.detailsRow}>
                    <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.details}>Class: {item.groupDetails?.name || 'Unknown'}</Text>
                </View>

                <View style={styles.detailsRow}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.frequency}>{item.frequency.toUpperCase()}</Text>
                </View>
            </View>
            <View style={styles.amountBadge}>
                <Text style={styles.amountText}>₹{item.amount.toLocaleString('en-IN')}</Text>
            </View>
        </View>
    );

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
                        Fee Structures
                    </Animated.Text>
                    <View style={styles.headerActionsWrapper}>
                        <HeaderActions />
                    </View>
                </View>

                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.iconBg}>
                        <Ionicons name="cash-outline" size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.heroTitle}>Fee Structures</Text>
                    <Text style={styles.heroSubtitle}>{structures.length} {structures.length === 1 ? 'Plan' : 'Plans'} Built</Text>
                </Animated.View>
            </Animated.View>

            <View style={styles.listWrapper}>
                {loading ? (
                    <View style={[globalStyles.centerMode, { marginTop: 40 }]}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <Animated.FlatList
                        data={structures}
                        keyExtractor={(item: any) => item._id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                        scrollEventThrottle={16}
                        ListEmptyComponent={
                            <View style={styles.emptyCardBox}>
                                <Ionicons name="document-text-outline" size={32} color={theme.colors.border} />
                                <Text style={[globalStyles.emptyText, { marginTop: 8 }]}>No fee structures created yet.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <TouchableOpacity style={[styles.fab, { bottom: Math.max(24, insets.bottom + 16) }]} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
                <LinearGradient
                    colors={theme.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={32} color={theme.colors.surface} />
                </LinearGradient>
            </TouchableOpacity>

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Create Fee Plan</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: '80%' }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                            <Text style={globalStyles.label}>Fee Name</Text>
                            <TextInput style={globalStyles.input} placeholder="e.g. Tuition Fee" value={name} onChangeText={setName} placeholderTextColor={theme.colors.textMuted} />

                            <Text style={globalStyles.label}>Amount (₹)</Text>
                            <TextInput style={globalStyles.input} placeholder="5000" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholderTextColor={theme.colors.textMuted} />

                            {groupsList.length > 0 && (
                                <>
                                    <Text style={globalStyles.label}>Assign to Class</Text>
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
                        </ScrollView>
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
        paddingHorizontal: theme.spacing.m,
        height: Platform.OS === 'ios' ? 100 : 80,
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
        zIndex: 100,
    },
    headerActionsWrapper: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: theme.borderRadius.s,
        padding: 4,
    },
    stickyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.surface,
        flex: 1,
        textAlign: 'center',
    },
    iconButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    heroContent: { alignItems: 'center', paddingHorizontal: theme.spacing.l, position: 'absolute', bottom: 30, left: 0, right: 0 },
    iconBg: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 12, ...theme.shadows.sm,
    },
    heroTitle: { fontSize: 26, fontWeight: 'bold', color: theme.colors.surface, letterSpacing: 0.5 },
    heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '500' },

    listWrapper: { flex: 1 },
    listContent: { paddingHorizontal: theme.spacing.m, paddingBottom: 120, paddingTop: Platform.OS === 'ios' ? 260 : 220 },

    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    cardInfo: { flex: 1, paddingRight: 12 },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    name: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary },
    deleteBtn: {
        padding: 4,
        backgroundColor: theme.colors.danger + '15',
        borderRadius: theme.borderRadius.s,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 6
    },
    details: { fontSize: 14, color: theme.colors.textSecondary },
    frequency: { fontSize: 12, color: theme.colors.textMuted, textTransform: 'uppercase', fontWeight: '600' },

    amountBadge: {
        backgroundColor: theme.colors.primaryLight + '15',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.primaryLight + '30',
    },
    amountText: { color: theme.colors.primary, fontSize: 16, fontWeight: '800' },

    mockPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    pill: {
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: theme.borderRadius.round,
        borderWidth: 1, borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface
    },
    pillActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '15'
    },
    pillText: { color: theme.colors.textSecondary, fontWeight: '500', fontSize: 14 },
    pillTextActive: { color: theme.colors.primary, fontWeight: 'bold' },

    emptyCardBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },

    fab: { position: 'absolute', bottom: 48, right: 24, ...theme.shadows.lg },
    fabGradient: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }
});
