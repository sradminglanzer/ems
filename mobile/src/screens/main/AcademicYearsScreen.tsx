import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

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
                <View style={styles.yearInfo}>
                    <Text style={styles.yearName}>
                        {item.name} {isGlobalActive && <Text style={styles.globalBadge}>(Global Active)</Text>}
                    </Text>
                    <Text style={styles.yearDates}>
                        {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                    </Text>
                </View>

                <View style={styles.actions}>
                    {isSelectedView ? (
                        <View style={styles.selectedBadge}>
                            <Ionicons name="eye" size={16} color={theme.colors.surface} />
                            <Text style={styles.selectedBadgeText}>Viewing Data</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleSelectViewYear(item._id)}>
                            <Text style={styles.actionButtonText}>View Data</Text>
                        </TouchableOpacity>
                    )}

                    {!isGlobalActive && (user?.role === 'admin' || user?.role === 'owner') && (
                        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => handleSetGlobalActive(item._id)}>
                            <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Set Global Active</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    useFocusEffect(
        React.useCallback(() => {
            navigation.setOptions({
                headerRight: () => (
                    user?.role === 'admin' || user?.role === 'owner' ? (
                        <TouchableOpacity onPress={() => setIsCreating(prev => !prev)} style={{ paddingRight: 16 }}>
                            <Ionicons name="add" size={28} color={theme.colors.primary} />
                        </TouchableOpacity>
                    ) : null
                )
            });
        }, [navigation, user, isCreating])
    );

    return (
        <View style={globalStyles.container}>
            {isCreating && (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.createCard}>
                        <Text style={globalStyles.label}>Year Name</Text>
                        <TextInput style={globalStyles.input} placeholder="e.g. 2024-2025" value={newYearName} onChangeText={setNewYearName} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={globalStyles.label}>Start Date</Text>
                                <TouchableOpacity style={[globalStyles.input, { paddingVertical: 14 }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('YYYY-MM-DD', formatDate(startDate)); if (p) setStartDate(new Date(p)); } else setShowStart(true); }}>
                                    <Text>{formatDate(startDate)}</Text>
                                </TouchableOpacity>
                                {showStart && Platform.OS !== 'web' && <DateTimePicker value={startDate} mode="date" onChange={(e, d) => { setShowStart(false); if (d) setStartDate(d); }} />}
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={globalStyles.label}>End Date</Text>
                                <TouchableOpacity style={[globalStyles.input, { paddingVertical: 14 }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('YYYY-MM-DD', formatDate(endDate)); if (p) setEndDate(new Date(p)); } else setShowEnd(true); }}>
                                    <Text>{formatDate(endDate)}</Text>
                                </TouchableOpacity>
                                {showEnd && Platform.OS !== 'web' && <DateTimePicker value={endDate} mode="date" onChange={(e, d) => { setShowEnd(false); if (d) setEndDate(d); }} />}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton, { marginTop: 16 }]}
                            onPress={handleCreateYear}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color={theme.colors.surface} /> : <Text style={globalStyles.submitButtonText}>Create Year</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}

            {loading ? (
                <View style={globalStyles.centerMode}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={years}
                    keyExtractor={item => item._id}
                    renderItem={renderYearItem}
                    contentContainerStyle={globalStyles.listContainer}
                    ListEmptyComponent={<Text style={globalStyles.emptyText}>No academic years configured.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.s,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: '600', color: theme.colors.textPrimary },
    createCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        margin: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2
    },
    yearCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        elevation: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1
    },
    selectedYearCard: {
        borderColor: theme.colors.success,
        borderWidth: 2,
        backgroundColor: theme.colors.success + '05'
    },
    yearInfo: { marginBottom: 12 },
    yearName: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
    globalBadge: { fontSize: 14, fontWeight: '500', color: theme.colors.primary, fontStyle: 'italic' },
    yearDates: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
    actions: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
    actionButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.s,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    actionButtonText: { color: theme.colors.surface, fontWeight: '600', fontSize: 14 },
    selectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.success,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.s,
        gap: 6
    },
    selectedBadgeText: { color: theme.colors.surface, fontWeight: '600', fontSize: 14 },
});
