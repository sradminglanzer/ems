import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform, TextInput, ScrollView, Modal, KeyboardAvoidingView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { theme, globalStyles } from '../../theme';
import HeaderActions from '../../components/HeaderActions';

export default function DiaryScreen() {
    const navigation = useNavigation<any>();
    const { user, selectedAcademicYearId } = useContext(AuthContext);

    const [feeGroups, setFeeGroups] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [diaries, setDiaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States for Creating Entry
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newType, setNewType] = useState('homework');
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal States for Tracking
    const [trackingModalVisible, setTrackingModalVisible] = useState(false);
    const [selectedDiary, setSelectedDiary] = useState<any>(null);
    const [trackingUpdates, setTrackingUpdates] = useState<any[]>([]);
    const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);

    // Initial Load: Fetch Classes
    useFocusEffect(
        useCallback(() => {
            const fetchClasses = async () => {
                try {
                    const res = await api.get('/fee-groups');
                    setFeeGroups(res.data);
                    if (res.data.length > 0 && !selectedGroup) {
                        setSelectedGroup(res.data[0]._id);
                    } else if (res.data.length === 0) {
                        setLoading(false);
                    }
                } catch (e) {
                    Alert.alert('Error', 'Failed to load classes');
                    setLoading(false);
                }
            };
            fetchClasses();
        }, [])
    );

    const fetchDiaries = async () => {
        if (!selectedGroup) return;
        setLoading(true);
        try {
            const res = await api.get('/diary', { params: { classId: selectedGroup, academicYearId: selectedAcademicYearId }});
            setDiaries(res.data);
        } catch (e) {
            Alert.alert('Error', 'Failed to load diary feed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiaries();
    }, [selectedGroup, selectedAcademicYearId]);

    const handleCreateEntry = async () => {
        if (!newTitle || !newDesc) {
            Alert.alert('Validation Error', 'Title and Description are required');
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post('/diary', {
                classId: selectedGroup,
                academicYearId: selectedAcademicYearId,
                type: newType,
                title: newTitle,
                description: newDesc
            });
            setCreateModalVisible(false);
            setNewTitle('');
            setNewDesc('');
            fetchDiaries();
        } catch (error: any) {
             Alert.alert('Error', 'Failed to create entry');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openTracking = (diary: any) => {
        if (diary.type !== 'homework' && diary.type !== 'test') {
            return; // Can't track basic announcements
        }
        setSelectedDiary(diary);
        // Map current state to local updates state map
        const mapped = diary.studentTracking.map((t: any) => ({
            memberId: typeof t.memberId === 'object' ? t.memberId._id : t.memberId,
            status: t.status,
            name: typeof t.memberId === 'object' ? `${t.memberId.firstName} ${t.memberId.lastName}` : 'Student'
        }));
        
        // Sort alphabetically
        mapped.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setTrackingUpdates(mapped);
        setTrackingModalVisible(true);
    };

    const toggleTrackingStatus = (memberId: string) => {
        setTrackingUpdates(prev => prev.map(t => {
            if (t.memberId === memberId) {
                const nextStatus = t.status === 'pending' ? 'completed' : (t.status === 'completed' ? 'not_done' : 'pending');
                return { ...t, status: nextStatus };
            }
            return t;
        }));
    };

    const handleSaveTracking = async () => {
        setIsUpdatingTracking(true);
        try {
            const res = await api.put(`/diary/${selectedDiary._id}/tracking`, {
                updates: trackingUpdates.map(t => ({ memberId: t.memberId, status: t.status }))
            });
            // Update local diaries array without refetching to save data
            setDiaries(prev => prev.map(d => d._id === selectedDiary._id ? res.data : d));
            setTrackingModalVisible(false);
        } catch (error) {
             Alert.alert('Error', 'Failed to update tracking');
        } finally {
            setIsUpdatingTracking(false);
        }
    };

    const renderHeader = () => (
        <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
        >
            <SafeAreaView>
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconButton}>
                        <Ionicons name="menu" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Digital Diary</Text>
                    <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={styles.iconButton}>
                        <Ionicons name="add" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );

    const renderFilterBar = () => (
        <View style={styles.filterBar}>
            <Text style={styles.filterLabel}>Viewing Class</Text>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={feeGroups}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.pill, selectedGroup === item._id && styles.pillActive]}
                        onPress={() => setSelectedGroup(item._id)}
                    >
                        <Text style={[styles.pillText, selectedGroup === item._id && styles.pillTextActive]}>
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.filterLabel}>No classes found</Text>}
            />
        </View>
    );

    const renderDiaryCard = ({ item }: { item: any }) => {
        let typeColor = theme.colors.primary;
        let typeIcon = 'book';

        if (item.type === 'homework') { typeColor = '#FF9500'; typeIcon = 'pencil'; }
        if (item.type === 'announcement') { typeColor = '#007AFF'; typeIcon = 'megaphone'; }
        if (item.type === 'reminder') { typeColor = '#FF3B30'; typeIcon = 'alert-circle'; }

        const isTrackable = item.type === 'homework' || item.type === 'test';

        // Count tracking metrics
        let completed = 0, notDone = 0, pending = 0;
        if (isTrackable && item.studentTracking) {
             item.studentTracking.forEach((t: any) => {
                 if (t.status === 'completed') completed++;
                 else if (t.status === 'not_done') notDone++;
                 else pending++;
             });
        }

        return (
            <TouchableOpacity 
                style={styles.diaryCard} 
                activeOpacity={isTrackable ? 0.7 : 1} 
                onPress={() => isTrackable ? openTracking(item) : null}
            >
                <View style={styles.diaryHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                         <Ionicons name={typeIcon as any} size={14} color={typeColor} />
                         <Text style={[styles.typeText, { color: typeColor }]}>{item.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                
                <Text style={styles.diaryTitle}>{item.title}</Text>
                <Text style={styles.diaryDesc}>{item.description}</Text>

                {isTrackable && item.studentTracking && (
                     <View style={styles.metricsBox}>
                         <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                             <View style={[styles.metricDot, {backgroundColor: theme.colors.success}]} />
                             <Text style={styles.metricText}>{completed} Completed</Text>
                         </View>
                         <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                             <View style={[styles.metricDot, {backgroundColor: theme.colors.danger}]} />
                             <Text style={styles.metricText}>{notDone} Not Done</Text>
                         </View>
                         <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                             <View style={[styles.metricDot, {backgroundColor: theme.colors.textSecondary}]} />
                             <Text style={styles.metricText}>{pending} Pending</Text>
                         </View>
                         <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} style={{marginLeft: 'auto'}} />
                     </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {renderHeader()}
            {renderFilterBar()}

            {loading ? (
                <View style={globalStyles.centerMode}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : diaries.length === 0 ? (
                <View style={globalStyles.centerMode}>
                    <Ionicons name="journal-outline" size={64} color={theme.colors.border} />
                    <Text style={globalStyles.emptyText}>No diary entries found for this class.</Text>
                </View>
            ) : (
                <FlatList
                    data={diaries}
                    keyExtractor={item => item._id}
                    renderItem={renderDiaryCard}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* CREATE MODAL */}
            <Modal animationType="slide" transparent={true} visible={createModalVisible}>
                <KeyboardAvoidingView style={globalStyles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={globalStyles.modalContent}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Publish to Diary</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={globalStyles.label}>Entry Type</Text>
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16}}>
                             {['homework', 'announcement', 'reminder', 'test'].map(t => (
                                 <TouchableOpacity 
                                     key={t} 
                                     style={[styles.pill, newType === t && styles.pillActive]} 
                                     onPress={() => setNewType(t)}>
                                     <Text style={[styles.pillText, newType === t && styles.pillTextActive]}>{t.toUpperCase()}</Text>
                                 </TouchableOpacity>
                             ))}
                        </View>

                        <Text style={globalStyles.label}>Title</Text>
                        <TextInput style={globalStyles.input} placeholder="e.g. Read Chapter 4" value={newTitle} onChangeText={setNewTitle} />

                        <Text style={globalStyles.label}>Description</Text>
                        <TextInput style={[globalStyles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Detailed instructions..." value={newDesc} onChangeText={setNewDesc} multiline />

                        <TouchableOpacity style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]} onPress={handleCreateEntry} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Ionicons name="send" size={20} color={theme.colors.surface} />
                                    <Text style={globalStyles.submitButtonText}>Publish & Auto-Assign</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* TRACKING MODAL */}
            <Modal animationType="slide" transparent={true} visible={trackingModalVisible}>
                <View style={[globalStyles.modalOverlay, { justifyContent: 'flex-end', margin: 0, padding: 0, backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <View style={[globalStyles.modalContent, { height: '80%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
                        <View style={globalStyles.modalHeader}>
                            <Text style={globalStyles.modalTitle}>Compliance Tracker</Text>
                            <TouchableOpacity onPress={() => setTrackingModalVisible(false)} style={globalStyles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{flex: 1, marginBottom: 16}}>
                             {trackingUpdates.map((t, index) => {
                                 let bgColor = theme.colors.background;
                                 let borderColor = theme.colors.border;
                                 let iconColor = theme.colors.textSecondary;
                                 let icon = 'ellipse-outline';

                                 if (t.status === 'completed') {
                                     bgColor = theme.colors.success + '20';
                                     borderColor = theme.colors.success;
                                     iconColor = theme.colors.success;
                                     icon = 'checkmark-circle';
                                 } else if (t.status === 'not_done') {
                                     bgColor = theme.colors.dangerLight + '20';
                                     borderColor = theme.colors.danger;
                                     iconColor = theme.colors.danger;
                                     icon = 'close-circle';
                                 }

                                 return (
                                     <TouchableOpacity 
                                         key={t.memberId}
                                         onPress={() => toggleTrackingStatus(t.memberId)}
                                         style={[styles.trackRow, { backgroundColor: bgColor, borderColor }]}
                                     >
                                         <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                             <View style={[styles.avatar, { width: 36, height: 36, borderRadius: 18, marginRight: 10 }]}>
                                                 <Text style={[styles.avatarText, { fontSize: 14 }]}>{t.name.charAt(0)}</Text>
                                             </View>
                                             <Text style={styles.trackName}>{t.name}</Text>
                                         </View>
                                         <View style={{alignItems: 'center'}}>
                                            <Ionicons name={icon as any} size={28} color={iconColor} />
                                            <Text style={{fontSize: 10, color: iconColor, fontWeight: 'bold'}}>{t.status.replace('_', ' ').toUpperCase()}</Text>
                                         </View>
                                     </TouchableOpacity>
                                 );
                             })}
                        </ScrollView>

                        <TouchableOpacity style={[globalStyles.submitButton, isUpdatingTracking && globalStyles.disabledButton]} onPress={handleSaveTracking} disabled={isUpdatingTracking}>
                            {isUpdatingTracking ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>Update Tracking</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16, ...theme.shadows.md,
    },
    topNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.m, paddingTop: Platform.OS === 'android' ? 40 : 10,
    },
    iconButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.surface },
    filterBar: {
        backgroundColor: theme.colors.surface, padding: theme.spacing.m,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    filterLabel: {
        fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary,
        textTransform: 'uppercase', marginBottom: 8,
    },
    pill: {
        paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
        backgroundColor: theme.colors.background, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border,
    },
    pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    pillText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
    pillTextActive: { color: theme.colors.surface },
    listContainer: { padding: theme.spacing.m },
    diaryCard: {
        backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l, marginBottom: theme.spacing.m, ...theme.shadows.sm,
        borderWidth: 1, borderColor: theme.colors.border
    },
    diaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    typeText: { fontSize: 10, fontWeight: 'bold' },
    dateText: { fontSize: 12, color: theme.colors.textSecondary },
    diaryTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 4 },
    diaryDesc: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
    metricsBox: {
        flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, gap: 12,
        borderTopWidth: 1, borderTopColor: theme.colors.border
    },
    metricDot: { width: 8, height: 8, borderRadius: 4 },
    metricText: { fontSize: 12, color: theme.colors.textPrimary, fontWeight: '500' },
    trackRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 12, marginBottom: 8, borderRadius: theme.borderRadius.m, borderWidth: 1
    },
    avatar: {
        backgroundColor: theme.colors.textSecondary + '30', justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontWeight: 'bold', color: theme.colors.textPrimary },
    trackName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary }
});
