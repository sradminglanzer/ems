import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, ScrollView, Modal, Dimensions, SafeAreaView, Animated } from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import HeaderActions from '../../components/HeaderActions';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ExamDetailsScreen() {
    const { selectedAcademicYearId } = useContext(AuthContext);
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

    const scrollY = useRef(new Animated.Value(0)).current;

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [Platform.OS === 'ios' ? 340 : 300, Platform.OS === 'ios' ? 150 : 130],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 60],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const headerTitleOpacity = scrollY.interpolate({
        inputRange: [60, 100],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    useEffect(() => {
        if (!selectedGroupId) return;

        const loadMembersForGroup = async () => {
            setLoadingMembers(true);
            try {
                const group = feeGroups.find(g => g._id === selectedGroupId);

                let groupMemberIds: string[] = [];
                if (group && group.yearlyRosters) {
                    const targetYearId = selectedAcademicYearId || exam.academicYearId;
                    const roster = group.yearlyRosters.find((r: any) => r.academicYearId === targetYearId);
                    if (roster && roster.members) {
                        groupMemberIds = roster.members;
                    }
                } else if (group && group.members) {
                    // Legacy fallback
                    groupMemberIds = group.members;
                }

                if (groupMemberIds.length > 0) {
                    const membersRes = await api.get('/members');
                    const matchedMembers = membersRes.data.filter((m: any) => groupMemberIds.includes(m._id));
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
    }, [selectedGroupId, feeGroups, selectedAcademicYearId, exam.academicYearId]);

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
                <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{item.firstName.charAt(0)}{item.lastName.charAt(0)}</Text>
                </View>
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
                        <View style={styles.missingBadge}>
                            <Text style={styles.missingBadgeText}>Not Graded</Text>
                        </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.primary, marginRight: 4, fontWeight: '600', fontSize: 13 }}>Grade</Text>
                        <Ionicons name="arrow-forward-circle" size={16} color={theme.colors.primary} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderGradingForm = ({ item, index }: { item: any, index: number }) => {
        const totalScore = resultsMap[item._id]?.marks?.reduce((sum: number, m: any) => sum + m.score, 0) || 0;
        const totalMax = resultsMap[item._id]?.marks?.reduce((sum: number, m: any) => sum + m.maxScore, 0) || 0;

        return (
            <ScrollView style={{ width }} contentContainerStyle={{ paddingBottom: 40 }}>
                <LinearGradient
                    colors={theme.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradingHeroHeader}
                >
                    <View style={styles.gradingAvatarBorder}>
                        <View style={styles.gradingAvatarInner}>
                            <Text style={styles.gradingAvatarText}>{item.firstName.charAt(0)}{item.lastName.charAt(0)}</Text>
                        </View>
                    </View>
                    <Text style={styles.gradingTitle}>{item.firstName} {item.lastName}</Text>
                    <Text style={styles.gradingSub}>Roll No: {item.knownId}</Text>

                    <View style={styles.gradingTotalBadge}>
                        <Text style={styles.gradingTotalText}>Total: {totalScore} / {totalMax}</Text>
                    </View>
                </LinearGradient>

                <View style={styles.gradingContent}>
                    <View style={styles.glassCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="book-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>Subject Marks</Text>
                        </View>

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
                        style={[globalStyles.submitButton, saving && globalStyles.disabledButton, { marginTop: 24 }]}
                        onPress={() => handleSaveAndNext(index)}
                        disabled={saving}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> :
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={globalStyles.submitButtonText}>
                                    {index < members.length - 1 ? 'Save & Next Student' : 'Save & Finish'}
                                </Text>
                                {index < members.length - 1 && <Ionicons name="arrow-forward" size={20} color={theme.colors.surface} />}
                            </View>
                        }
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    };

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
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Animated.Text style={[styles.stickyTitle, { opacity: headerTitleOpacity }]} numberOfLines={1}>
                        {exam.name}
                    </Animated.Text>
                    <HeaderActions />
                </View>

                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.examIconBg}>
                        <Ionicons name="document-text" size={36} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.heroTitle} numberOfLines={1}>{exam.name}</Text>
                    <Text style={styles.heroSubtitle}>Class Exam Results & Grading</Text>
                </Animated.View>

                {/* Embedded Group Selector in Header */}
                <View style={styles.selectorsBlock}>
                    <Animated.Text style={[styles.selectorLabel, { opacity: headerOpacity, height: headerOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }]}>
                        Select Class for Grading:
                    </Animated.Text>
                    {loadingGroups ? (
                        <ActivityIndicator style={{ padding: 12 }} color={theme.colors.surface} />
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
            </Animated.View>

            <View style={styles.listWrapper}>
                {loadingMembers ? (
                    <View style={[globalStyles.centerMode, { marginTop: 40 }]}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <Animated.FlatList
                        data={sortedMembers}
                        keyExtractor={(item: any) => item._id}
                        renderItem={renderMemberListItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                        scrollEventThrottle={16}
                        ListEmptyComponent={
                            <View style={styles.emptyCardBox}>
                                <Ionicons name="people-outline" size={32} color={theme.colors.border} />
                                <Text style={[globalStyles.emptyText, { marginTop: 8 }]}>No students in this group.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Full Screen Grading Overlay Modal */}
            <Modal visible={gradingIndex !== null} animationType="slide" onRequestClose={() => setGradingIndex(null)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setGradingIndex(null)} style={styles.modalBackButton}>
                            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.modalHeaderTitle}>Grading: {exam.name}</Text>
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
        paddingHorizontal: theme.spacing.l,
        height: Platform.OS === 'ios' ? 100 : 80,
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
    },
    stickyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.surface,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContent: {
        alignItems: 'center',
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 80,
        left: 0,
        right: 0,
        paddingHorizontal: theme.spacing.m,
    },
    examIconBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        ...theme.shadows.sm,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: theme.colors.surface,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
        fontWeight: '500',
    },
    selectorsBlock: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
    },
    selectorLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        paddingHorizontal: theme.spacing.l,
        marginBottom: 10
    },
    selectorRow: {
        paddingHorizontal: theme.spacing.l,
        flexDirection: 'row',
        paddingBottom: 4,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        marginRight: 10,
    },
    chipActive: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.surface,
        ...theme.shadows.sm,
    },
    chipText: {
        color: theme.colors.surface,
        fontWeight: '500'
    },
    chipTextActive: {
        color: theme.colors.primary,
        fontWeight: '700'
    },
    listWrapper: {
        flex: 1,
        marginTop: -20,
    },
    listContent: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: 40,
        paddingTop: Platform.OS === 'ios' ? 360 : 320,
    },
    memberCard: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: theme.borderRadius.m,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    memberAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primaryLight + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    memberAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    memberInfo: { flex: 1, paddingRight: 8 },
    memberName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary },
    memberId: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, fontWeight: '500' },
    missingBadge: {
        backgroundColor: theme.colors.danger + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.s,
        marginBottom: 6,
    },
    missingBadgeText: {
        color: theme.colors.danger,
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    emptyCardBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginHorizontal: theme.spacing.xs,
    },

    // Grading Modal Styles
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 12,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalBackButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: theme.colors.background,
        justifyContent: 'center', alignItems: 'center'
    },
    modalHeaderTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },

    gradingHeroHeader: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        ...theme.shadows.md,
    },
    gradingAvatarBorder: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    gradingAvatarInner: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradingAvatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.primary,
        letterSpacing: 1,
    },
    gradingTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.surface, textAlign: 'center' },
    gradingSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '500' },

    gradingTotalBadge: {
        marginTop: 16,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    gradingTotalText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: 'bold',
    },

    gradingContent: {
        padding: 16,
        marginTop: 8,
    },
    glassCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
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
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    gradingSubjectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '30'
    },
    gradingSubjectName: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, flex: 1 },
    markInputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
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
        fontWeight: 'bold'
    }
});
