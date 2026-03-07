import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import { theme, globalStyles } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';

export default function CreateExamScreen() {
    const { selectedAcademicYearId } = useContext(AuthContext);
    const navigation = useNavigation<any>();
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const [subjects, setSubjects] = useState<any[]>([]);
    const [activeYearName, setActiveYearName] = useState<string>('');

    // Subject Form Additions
    const [subName, setSubName] = useState('');
    const [subDate, setSubDate] = useState(new Date());
    const [subStartTime, setSubStartTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
    const [subEndTime, setSubEndTime] = useState(new Date(new Date().setHours(12, 0, 0, 0)));

    const [showSubDate, setShowSubDate] = useState(false);
    const [showSubStart, setShowSubStart] = useState(false);
    const [showSubEnd, setShowSubEnd] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    React.useEffect(() => {
        const fetchYearName = async () => {
            if (selectedAcademicYearId) {
                try {
                    const res = await api.get('/academic-years');
                    const yearObj = res.data.find((y: any) => y._id === selectedAcademicYearId);
                    if (yearObj) {
                        setActiveYearName(yearObj.name);
                    }
                } catch (e) {
                    console.error("Failed to fetch academic year details in CreateExam", e);
                }
            }
        };
        fetchYearName();
    }, [selectedAcademicYearId]);

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

    const handleAddSubject = () => {
        if (!subName.trim()) {
            return Alert.alert('Validation Error', 'Please enter a Subject Name.');
        }
        const newSubject = {
            name: subName,
            date: formatDate(subDate),
            startTime: formatTime(subStartTime),
            endTime: formatTime(subEndTime)
        };
        setSubjects([...subjects, newSubject]);
        setSubName('');
    };

    const handleRemoveSubject = (index: number) => {
        const newSubs = [...subjects];
        newSubs.splice(index, 1);
        setSubjects(newSubs);
    };

    const handleCreate = async () => {
        if (!name) {
            return Alert.alert('Validation Error', 'Please enter the Exam Name.');
        }
        if (subjects.length === 0) {
            return Alert.alert('Validation Error', 'Please add at least one subject to the timetable.');
        }
        if (!selectedAcademicYearId) {
            return Alert.alert('State Error', 'No active academic year found. Please select one from the settings menu or try re-logging.');
        }

        setIsSubmitting(true);
        try {
            await api.post('/exams', {
                name,
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                subjects,
                academicYearId: selectedAcademicYearId
            });
            Alert.alert('Success', 'Exam created successfully');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create exam');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView style={globalStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Animated Sticky Header */}
            <Animated.View style={[styles.animatedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={theme.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Animated.Text style={[styles.stickyTitle, { opacity: headerTitleOpacity }]}>
                        Create Exam
                    </Animated.Text>
                    <View style={{ width: 40 }} />
                </View>

                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.iconBg}>
                        <Ionicons name="create-outline" size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.heroTitle}>Create New Exam</Text>
                    <Text style={styles.heroSubtitle}>Set up examination schedule and subjects</Text>
                </Animated.View>
            </Animated.View>

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >

                {activeYearName ? (
                    <View style={styles.yearAlert}>
                        <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                        <Text style={styles.yearAlertText}>
                            Academic Year: <Text style={{ fontWeight: 'bold' }}>{activeYearName}</Text>
                        </Text>
                    </View>
                ) : null}

                {/* Exam Core Details Card */}
                <View style={[styles.glassCard, { marginTop: activeYearName ? 0 : -20 }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Exam Details</Text>
                    </View>

                    <Text style={globalStyles.label}>Exam Name *</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="e.g. Mid-Term Fall 2026"
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <View style={styles.dateRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={globalStyles.label}>Start Date *</Text>
                            <TouchableOpacity style={[globalStyles.input, { paddingVertical: 14 }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('Enter Start Date YYYY-MM-DD', formatDate(startDate)); if (p) setStartDate(new Date(p)); } else setShowStartDatePicker(true); }}>
                                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                            </TouchableOpacity>
                            {showStartDatePicker && Platform.OS !== 'web' && (
                                <DateTimePicker value={startDate} mode="date" display="default" onChange={(e, date) => { setShowStartDatePicker(false); if (date) setStartDate(date); }} />
                            )}
                        </View>
                        <View style={{ flex: 1, paddingLeft: 8 }}>
                            <Text style={globalStyles.label}>End Date *</Text>
                            <TouchableOpacity style={[globalStyles.input, { paddingVertical: 14 }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('Enter End Date YYYY-MM-DD', formatDate(endDate)); if (p) setEndDate(new Date(p)); } else setShowEndDatePicker(true); }}>
                                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                            </TouchableOpacity>
                            {showEndDatePicker && Platform.OS !== 'web' && (
                                <DateTimePicker value={endDate} mode="date" display="default" onChange={(e, date) => { setShowEndDatePicker(false); if (date) setEndDate(date); }} />
                            )}
                        </View>
                    </View>
                </View>

                {/* Subjects List */}
                <View style={[styles.sectionHeader, { marginTop: theme.spacing.m, marginBottom: theme.spacing.s, paddingHorizontal: 4, borderBottomWidth: 0 }]}>
                    <Ionicons name="list-outline" size={18} color={theme.colors.secondary} />
                    <Text style={styles.sectionTitle}>Scheduled Subjects ({subjects.length})</Text>
                </View>

                {subjects.map((sub, idx) => (
                    <View key={idx} style={styles.subjectListCard}>
                        <View style={styles.subjectIconWrap}>
                            <Text style={styles.subjectIndex}>{idx + 1}</Text>
                        </View>
                        <View style={styles.subjectInfo}>
                            <Text style={styles.subjectName}>{sub.name}</Text>
                            <View style={styles.subjectMetaRow}>
                                <View style={styles.metaItem}>
                                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                                    <Text style={styles.subjectTimeText}>{sub.date}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                                    <Text style={styles.subjectTimeText}>{sub.startTime} - {sub.endTime}</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveSubject(idx)} style={styles.removeAction}>
                            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                ))}

                {/* Sub-form to Add Subject */}
                <View style={styles.addFormContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Add Subject Entry</Text>
                    </View>

                    <TextInput
                        style={globalStyles.input}
                        placeholder="Subject Name (e.g. Mathematics)"
                        value={subName}
                        onChangeText={setSubName}
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <View style={styles.dateRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={globalStyles.label}>Exam Date</Text>
                            <TouchableOpacity style={[globalStyles.input, { paddingVertical: 14 }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('Enter Date YYYY-MM-DD', formatDate(subDate)); if (p) setSubDate(new Date(p)); } else setShowSubDate(true); }}>
                                <Text style={styles.dateText}>{formatDate(subDate)}</Text>
                            </TouchableOpacity>
                            {showSubDate && Platform.OS !== 'web' && <DateTimePicker value={subDate} mode="date" onChange={(e, date) => { setShowSubDate(false); if (date) setSubDate(date); }} />}
                        </View>
                    </View>

                    <Text style={globalStyles.label}>Time Window (Start - End)</Text>
                    <View style={styles.timeWindowRow}>
                        <TouchableOpacity style={styles.timeInputBox} onPress={() => { if (Platform.OS === 'web') { const p = prompt('Enter Start Time HH:MM AM/PM', formatTime(subStartTime)); } else setShowSubStart(true); }}>
                            <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                            <Text style={styles.dateText}>{formatTime(subStartTime)}</Text>
                        </TouchableOpacity>
                        {showSubStart && Platform.OS !== 'web' && <DateTimePicker value={subStartTime} mode="time" onChange={(e, date) => { setShowSubStart(false); if (date) setSubStartTime(date); }} />}

                        <Ionicons name="arrow-forward" size={16} color={theme.colors.textSecondary} style={{ marginHorizontal: 8 }} />

                        <TouchableOpacity style={styles.timeInputBox} onPress={() => { if (Platform.OS === 'web') { const p = prompt('Enter End Time HH:MM AM/PM', formatTime(subEndTime)); } else setShowSubEnd(true); }}>
                            <Ionicons name="time-outline" size={16} color={theme.colors.secondary} />
                            <Text style={styles.dateText}>{formatTime(subEndTime)}</Text>
                        </TouchableOpacity>
                        {showSubEnd && Platform.OS !== 'web' && <DateTimePicker value={subEndTime} mode="time" onChange={(e, date) => { setShowSubEnd(false); if (date) setSubEndTime(date); }} />}
                    </View>

                    <TouchableOpacity style={styles.addSubjectButton} onPress={handleAddSubject}>
                        <Ionicons name="add" size={20} color={theme.colors.primary} />
                        <Text style={styles.addSubjectText}>Add To Timetable</Text>
                    </TouchableOpacity>
                </View>

            </Animated.ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]}
                    onPress={handleCreate}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={theme.colors.surface} />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.surface} />
                            <Text style={globalStyles.submitButtonText}>Publish Exam</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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

    scrollContent: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.xxl,
        paddingTop: Platform.OS === 'ios' ? 260 : 220,
    },
    yearAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primaryLight + '20',
        padding: 12,
        borderRadius: theme.borderRadius.m,
        marginTop: 16,
        marginBottom: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.primaryLight + '40',
        ...theme.shadows.sm,
    },
    yearAlertText: { flex: 1, color: theme.colors.primary, fontSize: 14 },

    glassCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.l,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '50',
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        textTransform: 'uppercase',
    },
    dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dateText: { fontSize: 15, color: theme.colors.textPrimary, fontWeight: '500' },

    addFormContainer: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        marginTop: 10,
    },
    timeWindowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    timeInputBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.background,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.s,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    addSubjectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.primaryLight + '20',
        borderWidth: 1,
        borderColor: theme.colors.primaryLight + '50',
    },
    addSubjectText: { color: theme.colors.primary, fontWeight: 'bold', marginLeft: 8, fontSize: 14, textTransform: 'uppercase' },

    subjectListCard: {
        backgroundColor: theme.colors.surface,
        padding: 12,
        borderRadius: theme.borderRadius.m,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...theme.shadows.sm,
    },
    subjectIconWrap: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: theme.colors.primaryLight + '20',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    subjectIndex: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 },
    subjectInfo: { flex: 1 },
    subjectName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 4 },
    subjectMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center' },
    subjectTimeText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
    removeAction: {
        padding: 8,
        backgroundColor: theme.colors.danger + '10',
        borderRadius: theme.borderRadius.s,
    },

    footer: {
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingBottom: Platform.OS === 'ios' ? 32 : theme.spacing.m,
        ...theme.shadows.md,
    }
});
