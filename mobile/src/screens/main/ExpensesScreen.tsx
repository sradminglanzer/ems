import React, { useState, useCallback, useRef, useContext } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Platform, Animated, Image
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';
import { AuthContext } from '../../context/AuthContext';

const CATEGORY_ICONS: Record<string, string> = {
    'Rent / Lease': '🏠',
    'Electricity': '⚡',
    'Water': '💧',
    'Internet & Phone': '📡',
    'Staff Salaries': '👤',
    'Equipment Purchase': '🏋️',
    'Equipment Maintenance': '🔧',
    'Cleaning & Housekeeping': '🧹',
    'Marketing & Advertising': '📢',
    'Supplements & Products': '💊',
    'Gym Supplies': '🛍️',
    'Software & Subscriptions': '💻',
    'Insurance': '🛡️',
    'Taxes & Govt Fees': '🏛️',
    'Miscellaneous': '📋',
};

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank', card: 'Card'
};

const PAYMENT_COLORS: Record<string, string> = {
    cash: '#10B981', upi: '#6366F1', bank_transfer: '#F59E0B', card: '#3B82F6'
};

const ALL_CATEGORIES = [
    'Rent / Lease', 'Electricity', 'Water', 'Internet & Phone',
    'Staff Salaries', 'Equipment Purchase', 'Equipment Maintenance',
    'Cleaning & Housekeeping', 'Marketing & Advertising',
    'Supplements & Products', 'Gym Supplies', 'Software & Subscriptions',
    'Insurance', 'Taxes & Govt Fees', 'Miscellaneous',
];

export default function ExpensesScreen() {
    const { user } = useContext(AuthContext);
    const navigation = useNavigation<any>();
    const canManage = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'superadmin';

    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-based
    const [selectedCategory, setSelectedCategory] = useState('');
    const [expenses, setExpenses] = useState<any[]>([]);
    const [summary, setSummary] = useState<{ _id: string; total: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const scrollY = useRef(new Animated.Value(0)).current;

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [Platform.OS === 'ios' ? 200 : 170, Platform.OS === 'ios' ? 100 : 80],
        extrapolate: 'clamp',
    });
    const headerOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: 'clamp' });
    const headerTitleOpacity = scrollY.interpolate({ inputRange: [40, 80], outputRange: [0, 1], extrapolate: 'clamp' });

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
            const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
            const params: any = { startDate, endDate, year: selectedYear, month: selectedMonth };
            if (selectedCategory) params.category = selectedCategory;

            const res = await api.get('/expenses', { params });
            setExpenses(res.data.expenses || []);
            setSummary(res.data.summary || []);
        } catch (e) {
            console.error('Failed to load expenses', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchExpenses(); }, [selectedYear, selectedMonth, selectedCategory]));

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'long' });
    const totalSpend = expenses.filter(e => e.status === 'confirmed').reduce((s, e) => s + e.amount, 0);
    const pendingCount = expenses.filter(e => e.status === 'pending_confirmation').length;

    const prevMonth = () => {
        if (selectedMonth === 1) { setSelectedYear(y => y - 1); setSelectedMonth(12); }
        else setSelectedMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (selectedMonth === 12) { setSelectedYear(y => y + 1); setSelectedMonth(1); }
        else setSelectedMonth(m => m + 1);
    };

    const handleConfirmRecurring = async (expense: any) => {
        try {
            await api.put(`/expenses/${expense._id}/confirm`, { amount: expense.amount });
            fetchExpenses();
        } catch (e) {
            console.error('Failed to confirm expense', e);
        }
    };

    const renderHeader = () => (
        <View>
            {/* Month Selector */}
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
                    <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{monthName} {selectedYear}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
                    <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.summaryLabel}>Total Spent</Text>
                    <Text style={styles.summaryAmount}>₹{totalSpend.toLocaleString('en-IN')}</Text>
                    {pendingCount > 0 && (
                        <Text style={{ fontSize: 12, color: '#D97706', marginTop: 4 }}>
                            ⏳ {pendingCount} recurring expense{pendingCount > 1 ? 's' : ''} pending confirmation
                        </Text>
                    )}
                </View>
                {summary.slice(0, 2).map(s => (
                    <View key={s._id} style={styles.summaryChip}>
                        <Text style={styles.summaryChipIcon}>{CATEGORY_ICONS[s._id] || '📋'}</Text>
                        <Text style={styles.summaryChipText}>{s._id.split(' ')[0]}</Text>
                        <Text style={styles.summaryChipAmount}>₹{s.total.toLocaleString('en-IN')}</Text>
                    </View>
                ))}
            </View>

            {/* Pending Confirmation Row */}
            {expenses.filter(e => e.status === 'pending_confirmation').length > 0 && (
                <View style={{ marginBottom: 8 }}>
                    <Text style={[styles.sectionLabel, { color: '#D97706' }]}>⏳ Awaiting Confirmation</Text>
                    {expenses.filter(e => e.status === 'pending_confirmation').map((e: any) => (
                        <View key={e._id} style={[styles.expenseCard, { borderColor: '#F59E0B50', borderWidth: 1.5 }]}>
                            <View style={styles.categoryEmoji}>
                                <Text style={{ fontSize: 22 }}>{CATEGORY_ICONS[e.category] || '📋'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.expenseTitle}>{e.title}</Text>
                                <Text style={styles.expenseMeta}>{e.category} · ⟳ Recurring</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.expenseAmount}>₹{e.amount.toLocaleString('en-IN')}</Text>
                                <TouchableOpacity
                                    style={styles.confirmBtn}
                                    onPress={() => handleConfirmRecurring(e)}
                                >
                                    <Text style={styles.confirmBtnText}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Category Filter Pills */}
            <Text style={styles.sectionLabel}>Filter by Category</Text>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={['', ...ALL_CATEGORIES]}
                keyExtractor={item => item || 'all'}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.filterPill, selectedCategory === item && styles.filterPillActive]}
                        onPress={() => setSelectedCategory(item)}
                    >
                        <Text style={[styles.filterPillText, selectedCategory === item && styles.filterPillTextActive]}>
                            {item ? `${CATEGORY_ICONS[item] || ''} ${item}` : 'All'}
                        </Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 12, gap: 8 }}
            />

            {expenses.filter(e => e.status === 'confirmed').length > 0 && (
                <Text style={styles.sectionLabel}>Confirmed Expenses</Text>
            )}
        </View>
    );

    const renderExpense = ({ item }: { item: any }) => {
        if (item.status === 'pending_confirmation') return null;
        return (
            <TouchableOpacity
                style={styles.expenseCard}
                activeOpacity={0.8}
                onPress={() => canManage && navigation.navigate('AddExpense', { expenseToEdit: item })}
            >
                <View style={styles.categoryEmoji}>
                    <Text style={{ fontSize: 22 }}>{CATEGORY_ICONS[item.category] || '📋'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.expenseTitle}>{item.title}</Text>
                    <Text style={styles.expenseMeta}>
                        {item.category}
                        {item.vendor ? ` · ${item.vendor}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                        <View style={[styles.methodBadge, { backgroundColor: (PAYMENT_COLORS[item.paymentMethod] || '#6B7280') + '20' }]}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: PAYMENT_COLORS[item.paymentMethod] || '#6B7280' }}>
                                {PAYMENT_LABELS[item.paymentMethod] || item.paymentMethod}
                            </Text>
                        </View>
                        {item.isRecurring && (
                            <View style={[styles.methodBadge, { backgroundColor: theme.colors.primaryLight + '20' }]}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>⟳ Recurring</Text>
                            </View>
                        )}
                        {item.receiptUrl && (
                            <Ionicons name="document-attach-outline" size={14} color={theme.colors.textMuted} />
                        )}
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.expenseAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 4 }}>
                        {new Date(item.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Animated Sticky Header */}
            <Animated.View style={[styles.animatedHeader, { height: headerHeight }]}>
                <LinearGradient colors={theme.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => (navigation as any).openDrawer()} style={styles.iconButton}>
                        <Ionicons name="menu" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Animated.Text style={[styles.stickyTitle, { opacity: headerTitleOpacity }]}>Expenses</Animated.Text>
                    <HeaderActions />
                </View>
                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View>
                        <Text style={styles.heroTitle}>Expense Manager</Text>
                        <Text style={styles.heroSubtitle}>Track every rupee spent</Text>
                    </View>
                    <View style={styles.heroIcon}>
                        <Ionicons name="wallet" size={36} color="rgba(255,255,255,0.9)" />
                    </View>
                </Animated.View>
            </Animated.View>

            {/* List */}
            <View style={styles.listWrapper}>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
                ) : (
                    <Animated.FlatList
                        data={expenses}
                        keyExtractor={(item: any) => item._id}
                        renderItem={renderExpense}
                        ListHeaderComponent={renderHeader}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                        scrollEventThrottle={16}
                        ListEmptyComponent={
                            !loading ? (
                                <View style={styles.emptyBox}>
                                    <Ionicons name="receipt-outline" size={40} color={theme.colors.border} />
                                    <Text style={globalStyles.emptyText}>No expenses recorded for {monthName}</Text>
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>

            {/* FAB — owner/admin only */}
            {canManage && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('AddExpense')}
                    activeOpacity={0.85}
                >
                    <LinearGradient colors={theme.gradients.primary} style={styles.fabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <Ionicons name="add" size={28} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    animatedHeader: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        paddingTop: Platform.OS === 'ios' ? 44 : 0,
        overflow: 'hidden',
    },
    topNav: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    },
    stickyTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
    iconButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    heroContent: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
    },
    heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    heroIcon: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    listWrapper: { flex: 1, marginTop: Platform.OS === 'ios' ? 200 : 170 },
    listContent: { padding: 16, paddingBottom: 100 },
    monthSelector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    monthArrow: { padding: 8 },
    monthLabel: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginHorizontal: 16, minWidth: 160, textAlign: 'center' },
    summaryCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 16, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: theme.colors.border,
        gap: 12,
    },
    summaryLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryAmount: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 2 },
    summaryChip: {
        alignItems: 'center', backgroundColor: theme.colors.background,
        borderRadius: 10, padding: 8, minWidth: 72,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    summaryChipIcon: { fontSize: 18 },
    summaryChipText: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600', marginTop: 2 },
    summaryChipAmount: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 2 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    filterPill: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    filterPillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterPillText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
    filterPillTextActive: { color: '#fff' },
    expenseCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 14, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: theme.colors.border,
        gap: 12,
    },
    categoryEmoji: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: theme.colors.background,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.colors.border,
    },
    expenseTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
    expenseMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    expenseAmount: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
    methodBadge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    confirmBtn: {
        marginTop: 6, backgroundColor: '#D97706',
        paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 8,
    },
    confirmBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    emptyBox: { alignItems: 'center', marginTop: 40, gap: 10 },
    fab: {
        position: 'absolute', bottom: 28, right: 24,
        width: 60, height: 60, borderRadius: 30,
        shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
    },
    fabGradient: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
