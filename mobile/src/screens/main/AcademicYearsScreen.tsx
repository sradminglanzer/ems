import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform, TextInput, KeyboardAvoidingView, Modal, Animated } from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';

export default function AcademicYearsScreen() {
    const { user, selectedAcademicYearId, setSelectedAcademicYearId } = useContext(AuthContext);
    const navigation = useNavigation<any>();
    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [newYearName, setNewYearName] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 5, 1)); // Default June 1st
    const [endDate, setEndDate] = useState(new Date(new Date().getFullYear() + 1, 4, 31)); // Default May 31st
    const [showStart, setShowStart] = useState(false);
    const [showEnd, setShowEnd] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const loadYears = async () => {
        try {
            setLoading(true);
            const res = await api.get('/academic-years');
            setYears(res.data);

            // Auto-select if nothing is selected and there's an active one locally
            if (!selectedAcademicYearId && res.data.length > 0) {
                const active = res.data.find((y: any) => y.isActive);
                if (active) {
                    setSelectedAcademicYearId(active._id);
                } else {
                    setSelectedAcademicYearId(res.data[0]._id);
                }
            }
        } catch (error) {
            console.error('Failed to load academic years', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadYears();
        }, [])
    );

    const scrollY = useRef(new Animated.Value(0)).current;

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [Platform.OS === 'ios' ? 260 : 220, Platform.OS === 'ios' ? 100 : 80],
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

    const handleCreateYear = async () => {
        if (!newYearName.trim()) {
            return Alert.alert('Error', 'Please enter a name for the academic year.');
        }

        setIsSubmitting(true);
        try {
            await api.post('/academic-years', {
                name: newYearName,
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                isActive: years.length === 0 // Make it active if it's the first one
            });
            setIsCreating(false);
            setNewYearName('');
            loadYears();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create academic year.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetGlobalActive = async (yearId: string) => {
        try {
            await api.put(`/academic-years/${yearId}`, { isActive: true });
            Alert.alert('Success', 'Global active academic year updated.');
            setSelectedAcademicYearId(yearId);
            loadYears(); // Reload to refresh list and the contextual logic
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update academic year.');
        }
    };

    const handleSelectViewYear = (yearId: string) => {
        setSelectedAcademicYearId(yearId);
    };

    const renderYearItem = ({ item }: { item: any }) => {
        const isSelectedView = item._id === selectedAcademicYearId;
        const isGlobalActive = item.isActive;

        return (
            <View style={[styles.yearCard, isSelectedView && styles.selectedYearCard]}>
                <View style={styles.cardHeader}>
                    <View style={styles.yearIconBox}>
                        <Ionicons name="calendar-outline" size={20} color={isSelectedView ? theme.colors.success : theme.colors.primary} />
                    </View>
                    <View style={styles.yearInfo}>
                        <Text style={styles.yearName}>{item.name}</Text>
                        <Text style={styles.yearDates}>
                            {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                        </Text>
                    </View>
                    {isGlobalActive && (
                        <View style={styles.globalBadge}>
                            <Ionicons name="star" size={12} color={theme.colors.warning} style={{ marginRight: 4 }} />
                            <Text style={styles.globalBadgeText}>Current</Text>
                        </View>
                    )}
                </View>

                <View style={styles.actions}>
                    {isSelectedView ? (
                        <View style={styles.selectedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                            <Text style={styles.selectedBadgeText}>Active View</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleSelectViewYear(item._id)}>
                            <Ionicons name="eye-outline" size={16} color={theme.colors.surface} style={{ marginRight: 6 }} />
                            <Text style={styles.actionButtonText}>Switch View</Text>
                        </TouchableOpacity>
                    )}

                    {!isGlobalActive && (user?.role === 'admin' || user?.role === 'owner') && (
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => handleSetGlobalActive(item._id)}>
                            <Ionicons name="star-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.secondaryButtonText}>Set Default</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={globalStyles.container}>
            {/* Animated Hero Header */}
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
                        Academic Years
                    </Animated.Text>

                    <View style={styles.rightNav}>
                        {(user?.role === 'admin' || user?.role === 'owner') ? (
                            <TouchableOpacity onPress={() => setIsCreating(true)} style={styles.iconButton}>
                                <Ionicons name="add" size={24} color={theme.colors.surface} />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 40 }} /> // Spacer to keep title centered
                        )}
                    </View>
                </View>

                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.iconBg}>
                        <Ionicons name="calendar" size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.heroTitle}>Academic Years</Text>
                    <Text style={styles.heroSubtitle}>Manage sessions and switch context</Text>
                </Animated.View>
            </Animated.View>

            <View style={styles.listWrapper}>
                {loading ? (
                    <View style={[globalStyles.centerMode, { marginTop: 40 }]}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <Animated.FlatList
                        data={years}
                        keyExtractor={(item: any) => item._id}
                        renderItem={renderYearItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                        scrollEventThrottle={16}
                        ListEmptyComponent={
                            <View style={styles.emptyCardBox}>
                                <Ionicons name="calendar-outline" size={32} color={theme.colors.border} />
                                <Text style={[globalStyles.emptyText, { marginTop: 8 }]}>No academic years configured.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Create Academic Year Modal */}
            <Modal animationType="slide" transparent={true} visible={isCreating} onRequestClose={() => setIsCreating(false)}>
                <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>New Academic Year</Text>
                            <TouchableOpacity onPress={() => setIsCreating(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Year Name</Text>
                        <TextInput
                            style={globalStyles.input}
                            placeholder="e.g. 2026-2027"
                            value={newYearName}
                            onChangeText={setNewYearName}
                            placeholderTextColor={theme.colors.textMuted}
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={globalStyles.label}>Start Date</Text>
                                <TouchableOpacity style={[globalStyles.input, { paddingVertical: 14 }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('YYYY-MM-DD', formatDate(startDate)); if (p) setStartDate(new Date(p)); } else setShowStart(true); }}>
                                    <Text style={{ fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary }}>{formatDate(startDate)}</Text>
                                </TouchableOpacity>
                                {showStart && Platform.OS !== 'web' && <DateTimePicker value={startDate} mode="date" onChange={(e, d) => { setShowStart(false); if (d) setStartDate(d); }} />}
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={globalStyles.label}>End Date</Text>
                                <TouchableOpacity style={[globalStyles.input, { paddingVertical: 14 }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('YYYY-MM-DD', formatDate(endDate)); if (p) setEndDate(new Date(p)); } else setShowEnd(true); }}>
                                    <Text style={{ fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary }}>{formatDate(endDate)}</Text>
                                </TouchableOpacity>
                                {showEnd && Platform.OS !== 'web' && <DateTimePicker value={endDate} mode="date" onChange={(e, d) => { setShowEnd(false); if (d) setEndDate(d); }} />}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]}
                            onPress={handleCreateYear}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color={theme.colors.surface} /> : <Text style={globalStyles.submitButtonText}>Create Year</Text>}
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
        paddingHorizontal: theme.spacing.m,
        height: Platform.OS === 'ios' ? 100 : 80,
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
    },
    rightNav: {
        width: 40,
        alignItems: 'flex-end',
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
    listContent: { paddingHorizontal: theme.spacing.m, paddingBottom: 120, paddingTop: Platform.OS === 'ios' ? 280 : 240 },

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

    yearCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    selectedYearCard: {
        borderColor: theme.colors.success + '80',
        backgroundColor: theme.colors.success + '05',
        borderWidth: 1.5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    yearIconBox: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: theme.colors.background,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12, borderWidth: 1, borderColor: theme.colors.border
    },
    yearInfo: { flex: 1 },
    yearName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary },
    yearDates: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, fontWeight: '500' },

    globalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.warning + '15',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.warning + '30'
    },
    globalBadgeText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.warning, textTransform: 'uppercase' },

    actions: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border + '50',
        paddingTop: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.round,
        ...theme.shadows.sm,
    },
    actionButtonText: { color: theme.colors.surface, fontWeight: 'bold', fontSize: 13 },

    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.round,
    },
    secondaryButtonText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 13 },

    selectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.success + '20',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.round,
        gap: 6,
        borderWidth: 1,
        borderColor: theme.colors.success + '40'
    },
    selectedBadgeText: { color: theme.colors.success, fontWeight: 'bold', fontSize: 13 },
});
