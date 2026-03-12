import React, { useState, useCallback, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Animated } from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';

export default function ExamsScreen() {
    const navigation = useNavigation<any>();
    const [examsList, setExamsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { selectedAcademicYearId } = useContext(AuthContext);

    const fetchData = async () => {
        try {
            const params = selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {};
            const response = await api.get('/exams', { params });
            setExamsList(response.data);
        } catch (error: any) {
            console.error(error.response?.data);
            Alert.alert('Error', 'Failed to fetch exams list');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
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
        fetchData();
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.examCard} activeOpacity={0.8} onPress={() => navigation.navigate('ExamDetails', { exam: item })}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={theme.gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                    >
                        <Ionicons name="document-text" size={24} color={theme.colors.surface} />
                    </LinearGradient>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.examName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.examDates}>{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                        <View style={styles.subjectBadge}>
                            <Text style={styles.subjectBadgeText}>{item.subjects?.length || 0} Subjects</Text>
                        </View>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.border} />
            </View>
        </TouchableOpacity>
    );

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
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconButton}>
                        <Ionicons name="menu" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Animated.Text style={[styles.stickyTitle, { opacity: headerTitleOpacity }]}>
                        Examinations
                    </Animated.Text>
                    <View style={styles.headerActionsWrapper}>
                        <HeaderActions />
                    </View>
                </View>
                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.heroTextContent}>
                        <Text style={styles.heroTitle}>Examinations</Text>
                        <Text style={styles.heroSubtitle}>{examsList.length} scheduled</Text>
                    </View>
                    <View style={styles.heroIconBox}>
                        <Ionicons name="school" size={24} color={theme.colors.surface} />
                    </View>
                </Animated.View>
            </Animated.View>

            <View style={styles.listWrapper}>
                {loading ? (
                    <View style={globalStyles.centerMode}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <Animated.FlatList
                        data={examsList}
                        keyExtractor={(item) => item._id}
                        renderItem={renderItem}
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
                                <Ionicons name="document-text-outline" size={64} color={theme.colors.border} />
                                <Text style={globalStyles.emptyText}>No exams scheduled yet.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <TouchableOpacity style={globalStyles.fab} onPress={() => navigation.navigate('CreateExam')} activeOpacity={0.9}>
                <LinearGradient
                    colors={theme.gradients.primary}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={32} color={theme.colors.surface} />
                </LinearGradient>
            </TouchableOpacity>
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
        paddingBottom: 120, // Extra space for FAB
    },
    examCard: {
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
    iconContainer: {
        marginRight: 10,
    },
    iconGradient: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1
    },
    examName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 2
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 4,
    },
    examDates: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subjectBadge: {
        backgroundColor: theme.colors.primaryLight + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.s,
    },
    subjectBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
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
    }
});
