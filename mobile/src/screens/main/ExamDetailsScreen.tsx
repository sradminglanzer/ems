import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, ScrollView, Modal, Dimensions, SafeAreaView } from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ExamDetailsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { exam } = route.params;

    const [feeGroups, setFeeGroups] = useState<any[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    const [members, setMembers] = useState<any[]>([]);
    const [resultsMap, setResultsMap] = useState<any>({});

    const [loadingGroups, setLoadingGroups] = useState(true);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [saving, setSaving] = useState(false);

    // Grading Modal State
    const [gradingIndex, setGradingIndex] = useState<number | null>(null);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const groupRes = await api.get('/fee-groups');
                setFeeGroups(groupRes.data);
                if (groupRes.data.length > 0) {
                    setSelectedGroupId(groupRes.data[0]._id);
                }

                const resultsRes = await api.get(`/exams/${exam._id}/results`);
                const existingResults = resultsRes.data;

                const initialMap: any = {};
                existingResults.forEach((res: any) => {
                    initialMap[res.memberId] = {
                        marks: res.marks || [],
                        remarks: res.remarks || ''
                    };
                });
                setResultsMap(initialMap);
            } catch (error) {
                Alert.alert('Error', 'Failed to load initial data');
            } finally {
                setLoadingGroups(false);
            }
        };
        fetchInitial();
    }, [exam]);

    useEffect(() => {
        if (!selectedGroupId) return;

        const loadMembersForGroup = async () => {
            setLoadingMembers(true);
            try {
                const group = feeGroups.find(g => g._id === selectedGroupId);
                if (group && group.members?.length > 0) {
                    const membersRes = await api.get('/members');
                    const matchedMembers = membersRes.data.filter((m: any) => group.members.includes(m._id));
                    setMembers(matchedMembers);
                } else {
                    setMembers([]);
                }
            } catch (err) {
                Alert.alert('Error', 'Failed to load students for this group');
            } finally {
                setLoadingMembers(false);
            }
        };
        loadMembersForGroup();
    }, [selectedGroupId, feeGroups]);

    const handleUpdateMark = (memberId: string, subjectName: string, field: 'score' | 'maxScore', value: string) => {
        setResultsMap((prev: any) => {
            const memberData = prev[memberId] || { marks: [], remarks: '' };
            const existingMarks = [...memberData.marks];

            const markIndex = existingMarks.findIndex(m => m.subjectName === subjectName);
            const numValue = value === '' ? 0 : Number(value);

            if (markIndex >= 0) {
                existingMarks[markIndex] = { ...existingMarks[markIndex], [field]: numValue };
            } else {
                existingMarks.push({
                    subjectName,
                    score: field === 'score' ? numValue : 0,
                    maxScore: field === 'maxScore' ? numValue : 100
                });
            }

            return {
                ...prev,
                [memberId]: { ...memberData, marks: existingMarks }
            };
        });
    };

    const getMarkForMember = (memberId: string, subjectName: string) => {
        const memberData = resultsMap[memberId];
        if (!memberData) return { score: '', maxScore: '100' };

        const mark = memberData.marks.find((m: any) => m.subjectName === subjectName);
        return mark ? { score: mark.score.toString(), maxScore: mark.maxScore.toString() } : { score: '', maxScore: '100' };
    };

    const sortedMembers = useMemo(() => {
        return [...members].sort((a, b) => {
            const totalA = resultsMap[a._id]?.marks?.reduce((sum: number, mark: any) => sum + mark.score, 0) || 0;
            const totalB = resultsMap[b._id]?.marks?.reduce((sum: number, mark: any) => sum + mark.score, 0) || 0;
            return totalB - totalA; // Descending order
        });
    }, [members, resultsMap]);

    const handleSaveAndNext = async (currentIndex: number) => {
        const member = sortedMembers[currentIndex];
        const payload = {
            memberId: member._id,
            marks: resultsMap[member._id]?.marks || [],
            remarks: resultsMap[member._id]?.remarks || ''
        };

        setSaving(true);
        try {
            await api.post(`/exams/${exam._id}/results`, { results: [payload] });

            if (currentIndex < sortedMembers.length - 1) {
                const nextIndex = currentIndex + 1;
                flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                setGradingIndex(nextIndex);
            } else {
                Alert.alert('Success', 'All grades saved successfully!');
                setGradingIndex(null);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to save grades');
        } finally {
            setSaving(false);
        }
    };

    const renderMemberListItem = ({ item, index }: { item: any; index: number }) => {
        const studentMarks = resultsMap[item._id]?.marks || [];
        const hasResults = studentMarks.length > 0;
        const totalScore = studentMarks.reduce((sum: number, m: any) => sum + m.score, 0);
        const totalMax = studentMarks.reduce((sum: number, m: any) => sum + m.maxScore, 0);

        return (
            <TouchableOpacity style={styles.memberCard} onPress={() => setGradingIndex(index)}>
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
                    <Text style={styles.memberId}>Roll No: {item.knownId}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 16 }}>
                    {hasResults ? (
                        <Text style={{ color: theme.colors.success, fontWeight: '700', marginBottom: 4, fontSize: 16 }}>
                            {totalScore} <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>/ {totalMax}</Text>
                        </Text>
                    ) : (
                        <Text style={{ color: theme.colors.danger, fontSize: 13, marginBottom: 4, fontWeight: '500' }}>Missing</Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.primary, marginRight: 4, fontWeight: '500', fontSize: 13 }}>Results</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderGradingForm = ({ item, index }: { item: any, index: number }) => {
        return (
            <ScrollView style={{ width }} contentContainerStyle={{ padding: 16 }}>
                <View style={styles.gradingHeaderBox}>
                    <Text style={styles.gradingTitle}>{item.firstName} {item.lastName}</Text>
                    <Text style={styles.gradingSub}>Roll No: {item.knownId}</Text>
                </View>

                <View style={{ marginTop: 20 }}>
                    <Text style={globalStyles.label}>Subjects</Text>
                    {exam.subjects && exam.subjects.map((sub: any) => {
                        const mark = getMarkForMember(item._id, sub.name);
                        return (
                            <View key={sub.name} style={styles.gradingSubjectRow}>
                                <Text style={styles.gradingSubjectName}>{sub.name}</Text>
                                <View style={styles.markInputBox}>
                                    <TextInput
                                        style={styles.markInput}
                                        keyboardType="numeric"
                                        placeholder="Marks"
                                        value={mark.score}
                                        onChangeText={(val) => handleUpdateMark(item._id, sub.name, 'score', val)}
                                    />
                                    <Text style={styles.slash}>/</Text>
                                    <TextInput
                                        style={styles.markInput}
                                        keyboardType="numeric"
                                        placeholder="Max"
                                        value={mark.maxScore}
                                        onChangeText={(val) => handleUpdateMark(item._id, sub.name, 'maxScore', val)}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={[globalStyles.submitButton, saving && globalStyles.disabledButton, { marginTop: 32 }]}
                    onPress={() => handleSaveAndNext(index)}
                    disabled={saving}
                >
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>{index < members.length - 1 ? 'Save & Next Student' : 'Save & Finish'}</Text>}
                </TouchableOpacity>
            </ScrollView>
        );
    };

    return (
        <View style={globalStyles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{exam.name}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.selectorsBlock}>
                <View style={styles.selectorRowGroup}>
                    <Text style={styles.selectorLabel}>Select Group for Results:</Text>
                    {loadingGroups ? (
                        <ActivityIndicator style={{ padding: 12 }} />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorRow}>
                            {feeGroups.map(group => (
                                <TouchableOpacity
                                    key={group._id}
                                    style={[styles.chip, selectedGroupId === group._id && styles.chipActive]}
                                    onPress={() => setSelectedGroupId(group._id)}
                                >
                                    <Text style={[styles.chipText, selectedGroupId === group._id && styles.chipTextActive]}>{group.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </View>

            {loadingMembers ? (
                <View style={globalStyles.centerMode}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={sortedMembers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderMemberListItem}
                    contentContainerStyle={globalStyles.listContainer}
                    ListEmptyComponent={<Text style={globalStyles.emptyText}>No students in this group.</Text>}
                />
            )}

            {/* Full Screen Grading Overlay Modal */}
            <Modal visible={gradingIndex !== null} animationType="slide" onRequestClose={() => setGradingIndex(null)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setGradingIndex(null)} style={styles.backButton}>
                            <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Enter Grades</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        {sortedMembers.length > 0 && gradingIndex !== null && (
                            <FlatList
                                ref={flatListRef}
                                data={sortedMembers}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item._id}
                                initialScrollIndex={gradingIndex}
                                getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
                                onMomentumScrollEnd={(e) => {
                                    const newInd = Math.round(e.nativeEvent.contentOffset.x / width);
                                    if (newInd !== gradingIndex) setGradingIndex(newInd);
                                }}
                                renderItem={renderGradingForm}
                            />
                        )}
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.m,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: { padding: theme.spacing.xs },
    headerTitle: { fontSize: 20, fontWeight: '600', color: theme.colors.textPrimary },
    selectorsBlock: {
        backgroundColor: theme.colors.surface,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    selectorRowGroup: { marginBottom: 0 },
    selectorLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        paddingHorizontal: theme.spacing.m,
        marginBottom: 8
    },
    selectorRow: {
        paddingHorizontal: theme.spacing.m,
        flexDirection: 'row'
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: 10,
    },
    chipActive: {
        backgroundColor: theme.colors.primary + '20',
        borderColor: theme.colors.primary,
    },
    chipText: {
        color: theme.colors.textSecondary,
        fontWeight: '500'
    },
    chipTextActive: {
        color: theme.colors.textPrimary,
        fontWeight: '700'
    },
    memberCard: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: theme.borderRadius.m,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    memberInfo: { flex: 1, paddingRight: 12 },
    memberName: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
    memberId: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },

    // Grading Modal Styles
    gradingHeaderBox: {
        alignItems: 'center',
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginBottom: 12
    },
    gradingTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
    gradingSub: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 4 },

    gradingSubjectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '50'
    },
    gradingSubjectName: { fontSize: 16, fontWeight: '500', color: theme.colors.textPrimary, flex: 1 },
    markInputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    slash: {
        fontSize: 18,
        color: theme.colors.textSecondary,
        marginHorizontal: 4
    },
    markInput: {
        width: 45,
        height: 40,
        textAlign: 'center',
        fontSize: 16,
        color: theme.colors.textPrimary,
        fontWeight: '600'
    }
});
