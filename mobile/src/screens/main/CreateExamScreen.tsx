import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import { theme, globalStyles } from '../../theme';

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
        // Reset sub form
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
        <View style={globalStyles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create New Exam</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: theme.spacing.m }}>
                {activeYearName ? (
                    <View style={styles.yearAlert}>
                        <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                        <Text style={styles.yearAlertText}>
                            Exam will be created for academic year: <Text style={{ fontWeight: 'bold' }}>{activeYearName}</Text>
                        </Text>
                    </View>
                ) : null}

                <Text style={globalStyles.label}>Exam Name</Text>
                <TextInput style={globalStyles.input} placeholder="e.g. Term 1 Finals" value={name} onChangeText={setName} />

                <View style={styles.dateRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={globalStyles.label}>Start Date</Text>
                        <TouchableOpacity style={[globalStyles.input, { paddingVertical: 14 }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('Enter Start Date YYYY-MM-DD', formatDate(startDate)); if (p) setStartDate(new Date(p)); } else setShowStartDatePicker(true); }}>
                            <Text>{formatDate(startDate)}</Text>
                        </TouchableOpacity>
                        {showStartDatePicker && Platform.OS !== 'web' && (
                            <DateTimePicker value={startDate} mode="date" display="default" onChange={(e, date) => { setShowStartDatePicker(false); if (date) setStartDate(date); }} />
                        )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={globalStyles.label}>End Date</Text>
                        <TouchableOpacity style={[globalStyles.input, { paddingVertical: 14 }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('Enter End Date YYYY-MM-DD', formatDate(endDate)); if (p) setEndDate(new Date(p)); } else setShowEndDatePicker(true); }}>
                            <Text>{formatDate(endDate)}</Text>
                        </TouchableOpacity>
                        {showEndDatePicker && Platform.OS !== 'web' && (
                            <DateTimePicker value={endDate} mode="date" display="default" onChange={(e, date) => { setShowEndDatePicker(false); if (date) setEndDate(date); }} />
                        )}
                    </View>
                </View>

                {/* Existing Subjects List View */}
                {subjects.length > 0 && (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Scheduled Subjects</Text>
                    </View>
                )}

                {subjects.map((sub, idx) => (
                    <View key={idx} style={styles.subjectCard}>
                        <View style={styles.subjectInfo}>
                            <Text style={styles.subjectName}>{sub.name}</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                <Text style={styles.subjectTimeText}><Ionicons name="calendar-outline" size={14} /> {sub.date}</Text>
                                <Text style={styles.subjectTimeText}><Ionicons name="time-outline" size={14} /> {sub.startTime} - {sub.endTime}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveSubject(idx)} style={styles.removeAction}>
                            <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                ))}

                {/* Sub-form to Add Subject */}
                <View style={[styles.sectionHeader, { marginTop: subjects.length > 0 ? 12 : 0 }]}>
                    <Text style={styles.sectionTitle}>Add Subject to Timetable</Text>
                </View>

                <View style={styles.addFormContainer}>
                    <TextInput style={globalStyles.input} placeholder="Subject Name (e.g. Mathematics)" value={subName} onChangeText={setSubName} />

                    <View style={styles.dateRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={globalStyles.label}>Exam Date</Text>
                            <TouchableOpacity style={[globalStyles.input, { paddingVertical: 14 }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('Enter Date YYYY-MM-DD', formatDate(subDate)); if (p) setSubDate(new Date(p)); } else setShowSubDate(true); }}>
                                <Text>{formatDate(subDate)}</Text>
                            </TouchableOpacity>
                            {showSubDate && Platform.OS !== 'web' && <DateTimePicker value={subDate} mode="date" onChange={(e, date) => { setShowSubDate(false); if (date) setSubDate(date); }} />}
                        </View>
                    </View>

                    <Text style={globalStyles.label}>Start Time / End Time</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                        <TouchableOpacity style={[globalStyles.input, { flex: 1, paddingVertical: 14, alignItems: 'center' }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('Enter Start Time HH:MM AM/PM', formatTime(subStartTime)); /* Simple web fallback */ } else setShowSubStart(true); }}>
                            <Text>{formatTime(subStartTime)}</Text>
                        </TouchableOpacity>
                        {showSubStart && Platform.OS !== 'web' && <DateTimePicker value={subStartTime} mode="time" onChange={(e, date) => { setShowSubStart(false); if (date) setSubStartTime(date); }} />}

                        <TouchableOpacity style={[globalStyles.input, { flex: 1, paddingVertical: 14, alignItems: 'center' }]} onPress={() => { if (Platform.OS === 'web') { const p = prompt('Enter End Time HH:MM AM/PM', formatTime(subEndTime)); /* Simple web fallback */ } else setShowSubEnd(true); }}>
                            <Text>{formatTime(subEndTime)}</Text>
                        </TouchableOpacity>
                        {showSubEnd && Platform.OS !== 'web' && <DateTimePicker value={subEndTime} mode="time" onChange={(e, date) => { setShowSubEnd(false); if (date) setSubEndTime(date); }} />}
                    </View>

                    <TouchableOpacity style={styles.addSubjectButton} onPress={handleAddSubject}>
                        <Ionicons name="add" size={20} color={theme.colors.primary} />
                        <Text style={styles.addSubjectText}>Add Subject</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton, { marginTop: 32 }]} onPress={handleCreate} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color={theme.colors.surface} /> : <Text style={globalStyles.submitButtonText}>Publish Exam</Text>}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.m,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: { padding: theme.spacing.xs },
    headerTitle: { fontSize: 20, fontWeight: '600', color: theme.colors.textPrimary },
    dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    sectionHeader: { marginTop: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
    addFormContainer: {
        backgroundColor: theme.colors.secondary + '10',
        padding: 16,
        borderRadius: theme.borderRadius.m,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colors.secondary + '30'
    },
    addSubjectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.primary + '15',
    },
    addSubjectText: { color: theme.colors.primary, fontWeight: '600', marginLeft: 8, fontSize: 16 },
    subjectCard: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderRadius: theme.borderRadius.m,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    subjectInfo: { flex: 1 },
    subjectName: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
    subjectTimeText: { fontSize: 13, color: theme.colors.textSecondary },
    removeAction: { padding: 8 },
    yearAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary + '15',
        padding: 12,
        borderRadius: theme.borderRadius.m,
        marginBottom: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary + '30'
    },
    yearAlertText: {
        flex: 1,
        color: theme.colors.primary,
        fontSize: 14,
    }
});
