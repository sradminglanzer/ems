import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';

export default function ExpensesScreen() {
    const { user, selectedAcademicYearId } = useContext(AuthContext);
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [expensesList, setExpensesList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [newAmount, setNewAmount] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newPaymentMethod, setNewPaymentMethod] = useState('Cash');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories = ['Salary', 'Utilities', 'Maintenance', 'Events', 'Office Supplies', 'Other'];

    const fetchExpenses = async () => {
        try {
            const response = await api.get('/expenses', {
                params: { academicYearId: selectedAcademicYearId }
            });
            setExpensesList(response.data);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch expenses');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchExpenses();
        }, [selectedAcademicYearId])
    );

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

    const onRefresh = () => {
        setRefreshing(true);
        fetchExpenses();
    };

    const handleAddExpense = async () => {
        if (!newAmount || !newCategory) {
            Alert.alert('Validation Error', 'Amount and Category are required');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/expenses', {
                amount: Number(newAmount),
                category: newCategory,
                description: newDescription,
                paymentMethod: newPaymentMethod,
                academicYearId: selectedAcademicYearId
            });
            fetchExpenses();
            setModalVisible(false);

            setNewAmount('');
            setNewCategory('');
            setNewDescription('');
            setNewPaymentMethod('Cash');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to create expense';
            Alert.alert('Error', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        Alert.alert('Delete Expense', 'Are you sure you want to delete this expense record?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await api.delete(`/expenses/${id}`);
                        fetchExpenses();
                    } catch (e) {
                         Alert.alert('Error', 'Could not delete expense');
                    }
                }
            }
        ]);
    };

    const renderExpenseItem = ({ item }: { item: any }) => {
        return (
            <TouchableOpacity style={styles.groupCard} activeOpacity={0.9} onLongPress={() => handleDeleteExpense(item._id)}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient colors={theme.gradients.danger} style={styles.avatarGradient}>
                            <Ionicons name="cash-outline" size={20} color={theme.colors.surface} />
                        </LinearGradient>
                    </View>
                    <View style={styles.cardInfo}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                             <Text style={styles.groupName}>{item.category}</Text>
                             <Text style={[styles.groupName, {color: theme.colors.danger}]}>-₹{item.amount.toLocaleString()}</Text>
                        </View>
                        <Text style={styles.groupParams} numberOfLines={1}>
                            {new Date(item.expenseDate).toLocaleDateString()} • {item.paymentMethod}
                        </Text>
                        {item.description ? (
                             <Text style={styles.groupDesc} numberOfLines={1}>{item.description}</Text>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={globalStyles.container}>
            {/* Animated Sticky Header */}
            <Animated.View style={[styles.animatedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={theme.gradients.danger}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconButton}>
                        <Ionicons name="menu" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Animated.Text style={[styles.stickyTitle, { opacity: headerTitleOpacity }]}>
                        Manage Expenses
                    </Animated.Text>
                    <View style={styles.headerActionsWrapper}>
                        <HeaderActions />
                    </View>
                </View>
                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.heroTextContent}>
                        <Text style={styles.heroTitle}>Manage Expenses</Text>
                        <Text style={styles.heroSubtitle}>{expensesList.length} recorded this year</Text>
                    </View>
                    <View style={styles.heroIconBox}>
                        <Ionicons name="wallet-outline" size={24} color={theme.colors.surface} />
                    </View>
                </Animated.View>
            </Animated.View>

            <View style={styles.listWrapper}>
                {loading ? (
                    <View style={globalStyles.centerMode}>
                        <ActivityIndicator size="large" color={theme.colors.danger} />
                    </View>
                ) : (
                    <Animated.FlatList
                        data={expensesList}
                        keyExtractor={(item) => item._id}
                        renderItem={renderExpenseItem}
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
                                <Ionicons name="wallet-outline" size={64} color={theme.colors.border} />
                                <Text style={globalStyles.emptyText}>No expenses recorded yet.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <TouchableOpacity style={[globalStyles.fab, { bottom: Math.max(24, insets.bottom + 16) }]} onPress={() => setModalVisible(true)} activeOpacity={0.9}>
                <LinearGradient
                    colors={theme.gradients.danger}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={32} color={theme.colors.surface} />
                </LinearGradient>
            </TouchableOpacity>

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Record Expense</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Amount (₹)</Text>
                        <TextInput style={globalStyles.input} placeholder="e.g. 5000" value={newAmount} onChangeText={setNewAmount} keyboardType="numeric" />

                        <Text style={globalStyles.label}>Category</Text>
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16}}>
                             {categories.map(cat => (
                                 <TouchableOpacity 
                                     key={cat} 
                                     style={[styles.categoryPill, newCategory === cat && styles.categoryPillActive]} 
                                     onPress={() => setNewCategory(cat)}>
                                     <Text style={[styles.categoryPillText, newCategory === cat && styles.categoryPillTextActive]}>{cat}</Text>
                                 </TouchableOpacity>
                             ))}
                        </View>

                        <Text style={globalStyles.label}>Method</Text>
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16}}>
                             {['Cash', 'Bank', 'UPI', 'Cheque'].map(m => (
                                 <TouchableOpacity 
                                     key={m} 
                                     style={[styles.categoryPill, newPaymentMethod === m && styles.categoryPillActive]} 
                                     onPress={() => setNewPaymentMethod(m)}>
                                     <Text style={[styles.categoryPillText, newPaymentMethod === m && styles.categoryPillTextActive]}>{m}</Text>
                                 </TouchableOpacity>
                             ))}
                        </View>

                        <Text style={globalStyles.label}>Description (Optional)</Text>
                        <TextInput style={globalStyles.input} placeholder="e.g. Printer ink cartridges" value={newDescription} onChangeText={setNewDescription} />

                        <TouchableOpacity style={[globalStyles.submitButton, {backgroundColor: theme.colors.danger}, isSubmitting && globalStyles.disabledButton]} onPress={handleAddExpense} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.surface} />
                                    <Text style={globalStyles.submitButtonText}>Save Expense</Text>
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
        paddingBottom: 120, // Enough bottom padding for FAB
    },
    groupCard: {
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
    cardInfo: {
        flex: 1
    },
    groupName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 2
    },
    groupParams: {
        fontSize: 13,
        color: theme.colors.textSecondary
    },
    groupDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
        fontStyle: 'italic'
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
    categoryPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    categoryPillActive: {
        backgroundColor: theme.colors.danger,
        borderColor: theme.colors.danger,
    },
    categoryPillText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    categoryPillTextActive: {
        color: theme.colors.surface,
        fontWeight: 'bold',
    }
});
