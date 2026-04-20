import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { theme, globalStyles } from '../../theme';
import HeaderActions from '../../components/HeaderActions';

export default function AttendanceScreen() {
    const navigation = useNavigation<any>();
    const { user, selectedAcademicYearId } = useContext(AuthContext);

    const [feeGroups, setFeeGroups] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [attendanceDocument, setAttendanceDocument] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Initial Load: Fetch Classes
    useFocusEffect(
        useCallback(() => {
            const fetchClasses = async () => {
                try {
                    const res = await api.get('/fee-groups');
                    setFeeGroups(res.data);
                    if (res.data.length > 0 && !selectedGroup) {
                        setSelectedGroup(res.data[0]._id);
                    } else {
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

    // Fetch Attendance when Class or Date changes
    useEffect(() => {
        if (!selectedGroup || !date) return;
        setLoading(true);
        const fetchAttendance = async () => {
            try {
                const params = { classId: selectedGroup, date, academicYearId: selectedAcademicYearId };
                const res = await api.get('/attendance', { params });
                
                setAttendanceDocument(res.data);
                
                // If it's a new generated payload, populated data is heavily nested, but we map it cleanly
                const mappedRecords = res.data.records.map((r: any) => ({
                    memberId: typeof r.memberId === 'object' && r.memberId._id ? r.memberId._id : r.memberId,
                    firstName: typeof r.memberId === 'object' ? r.memberId.firstName : 'Student',
                    lastName: typeof r.memberId === 'object' ? r.memberId.lastName : '',
                    knownId: typeof r.memberId === 'object' ? r.memberId.knownId : '',
                    status: r.status,
                    remarks: r.remarks
                }));
                
                
                // Sort by name alphabetically
                mappedRecords.sort((a: any, b: any) => a.firstName.localeCompare(b.firstName));

                setRecords(mappedRecords);
            } catch (e: any) {
                console.error(e.response?.data);
                Alert.alert('Error', 'Failed to load attendance sheet');
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, [selectedGroup, date, selectedAcademicYearId]);

    const toggleStatus = (memberId: string) => {
        setRecords(prev => prev.map(r => {
            if (r.memberId === memberId) {
                const nextStatus = r.status === 'present' ? 'absent' : (r.status === 'absent' ? 'late' : 'present');
                return { ...r, status: nextStatus };
            }
            return r;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/attendance', {
                classId: selectedGroup,
                date,
                academicYearId: selectedAcademicYearId,
                records: records.map(r => ({
                    memberId: r.memberId,
                    status: r.status,
                    remarks: r.remarks
                }))
            });
            Alert.alert('Success', 'Attendance saved successfully!');
            setAttendanceDocument({ ...attendanceDocument, isNew: false });
        } catch (e) {
            Alert.alert('Error', 'Failed to save attendance');
        } finally {
            setSaving(false);
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
                    <Text style={styles.headerTitle}>Attendance Portal</Text>
                    <View style={styles.headerActionsWrapper}>
                        <HeaderActions />
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );

    const renderFilterBar = () => (
        <View style={styles.filterBar}>
            {/* Scrollable Class Selector */}
            <View>
                <Text style={styles.filterLabel}>Select Class</Text>
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

            {/* Quick Date Flipper */}
            <View style={styles.dateSelector}>
                <TouchableOpacity onPress={() => {
                    const d = new Date(date);
                    d.setDate(d.getDate() - 1);
                    setDate(d.toISOString().split('T')[0]);
                }} style={styles.dateBtn}>
                    <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                
                <Text style={styles.dateText}>{new Date(date).toDateString()}</Text>

                <TouchableOpacity onPress={() => {
                    const d = new Date(date);
                    d.setDate(d.getDate() + 1);
                    setDate(d.toISOString().split('T')[0]);
                }} style={styles.dateBtn}>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStudent = ({ item }: { item: any }) => {
        let bgColor = theme.colors.surface;
        let borderColor = theme.colors.border;
        let icon = 'checkmark-circle';
        let iconColor = theme.colors.success;

        if (item.status === 'absent') {
            bgColor = theme.colors.dangerLight + '20';
            borderColor = theme.colors.danger;
            icon = 'close-circle';
            iconColor = theme.colors.danger;
        } else if (item.status === 'late') {
            bgColor = theme.colors.warning + '20';
            borderColor = theme.colors.warning;
            icon = 'time';
            iconColor = theme.colors.warning;
        }

        return (
            <TouchableOpacity 
                style={[styles.studentCard, { backgroundColor: bgColor, borderColor: borderColor }]} 
                onPress={() => toggleStatus(item.memberId)}
                activeOpacity={0.7}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.firstName.charAt(0)}{item.lastName?.charAt(0)}</Text>
                </View>
                <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.firstName} {item.lastName}</Text>
                    <Text style={styles.studentMeta}>Roll No: {item.knownId || 'N/A'}</Text>
                </View>
                <View style={styles.statusBox}>
                    <Ionicons name={icon as any} size={32} color={iconColor} />
                    <Text style={[styles.statusText, { color: iconColor }]}>{item.status.toUpperCase()}</Text>
                </View>
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
            ) : records.length === 0 ? (
                <View style={globalStyles.centerMode}>
                    <Ionicons name="people-outline" size={64} color={theme.colors.border} />
                    <Text style={globalStyles.emptyText}>No students assigned to this class.</Text>
                </View>
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={item => item.memberId}
                    renderItem={renderStudent}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Floating Action Button */}
            {records.length > 0 && !loading && (
                <View style={styles.actionBar}>
                    <TouchableOpacity 
                        style={[globalStyles.submitButton, saving && globalStyles.disabledButton]} 
                        onPress={handleSave} 
                        disabled={saving}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Ionicons name={attendanceDocument?.isNew ? "save-outline" : "checkmark-done"} size={20} color={theme.colors.surface} />
                                <Text style={globalStyles.submitButtonText}>
                                    {attendanceDocument?.isNew ? 'Save Attendance' : 'Update Attendance'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 16,
        ...theme.shadows.md,
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.m,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
    },
    iconButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.surface,
    },
    headerActionsWrapper: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: theme.borderRadius.s,
        padding: 4,
    },
    filterBar: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    filterLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    pill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    pillActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    pillText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    pillTextActive: {
        color: theme.colors.surface,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.m,
        padding: 4,
    },
    dateBtn: {
        padding: 8,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.s,
        ...theme.shadows.sm,
    },
    dateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    listContainer: {
        padding: theme.spacing.m,
        paddingBottom: 100, // Make room for floating action bar
    },
    studentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        marginBottom: 10,
        ...theme.shadows.sm,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: theme.colors.textSecondary + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    studentMeta: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    statusBox: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 70,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 2,
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        ...theme.shadows.lg,
    }
});
