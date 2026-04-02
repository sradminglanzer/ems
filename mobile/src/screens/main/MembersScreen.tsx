import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Platform, Animated
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useContext } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';
import { AuthContext } from '../../context/AuthContext';
import { getTerm } from '../../utils/terminology';

export default function MembersScreen() {
    const { user } = useContext(AuthContext);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isPendingFeesFilter = route.params?.filter === 'pendingFees';

    const loadMembers = async () => {
        try {
            const response = await api.get('/members');
            setMembers(response.data);
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadMembers();
        }, [])
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
        loadMembers();
    };

    const displayedMembers = useMemo(() => {
        if (isPendingFeesFilter) {
            return members
                .filter((m: any) => (m.pendingAmount || 0) > 0)
                .sort((a: any, b: any) => (b.pendingAmount || 0) - (a.pendingAmount || 0));
        }
        return members;
    }, [members, isPendingFeesFilter]);

    const renderItem = ({ item }: { item: any }) => {
        const initials = `${item.firstName.charAt(0)}${item.lastName.charAt(0)}`.toUpperCase();

        return (
            <TouchableOpacity
                style={[styles.memberCard, isPendingFeesFilter ? { borderColor: theme.colors.dangerLight } : undefined]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('MemberDetails', { member: item })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={isPendingFeesFilter ? theme.gradients.danger : theme.gradients.primary}
                            style={styles.avatarGradient}
                        >
                            <Text style={styles.avatarText}>{initials}</Text>
                        </LinearGradient>
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.memberName} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
                        <View style={styles.badgeRow}>
                            <View style={styles.groupBadge}>
                                <Text style={styles.groupBadgeText}>{item.groupName || 'Unassigned'}</Text>
                            </View>
                            <Text style={styles.detailsText}>ID: {item.knownId}</Text>
                        </View>
                    </View>

                    {isPendingFeesFilter ? (
                        <View style={styles.pendingContainer}>
                            <Text style={styles.pendingLabel}>Pending</Text>
                            <Text style={styles.pendingAmount}>₹{item.pendingAmount.toLocaleString('en-IN')}</Text>
                        </View>
                    ) : (
                        <Ionicons name="chevron-forward" size={24} color={theme.colors.border} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={globalStyles.container}>
            {/* Animated Sticky Header */}
            <Animated.View style={[styles.animatedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={isPendingFeesFilter ? theme.gradients.danger : theme.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconButton}>
                        <Ionicons name="menu" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Animated.Text style={[styles.stickyTitle, { opacity: headerTitleOpacity }]}>
                        {isPendingFeesFilter ? 'Pending Collections' : `${getTerm('Student', user?.entityType)} Directory`}
                    </Animated.Text>
                    <View style={styles.headerActionsWrapper}>
                        <HeaderActions />
                    </View>
                </View>
                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.heroTextContent}>
                        <Text style={styles.heroTitle}>{isPendingFeesFilter ? 'Pending Collections' : `${getTerm('Student', user?.entityType)} Directory`}</Text>
                        <Text style={styles.heroSubtitle}>
                            {isPendingFeesFilter ? `${displayedMembers.length} deficits` : `${displayedMembers.length} enrolled`}
                        </Text>
                    </View>
                    <View style={styles.heroIconBox}>
                        <Ionicons name={isPendingFeesFilter ? "alert-circle" : "people"} size={24} color={theme.colors.surface} />
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
                        data={displayedMembers}
                        keyExtractor={(item: any) => item._id}
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
                                <Ionicons name="people-outline" size={64} color={theme.colors.border} />
                                <Text style={globalStyles.emptyText}>
                                    {isPendingFeesFilter ? 'All fees are clear!' : `No ${getTerm('Students', user?.entityType).toLowerCase()} found.`}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
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
        paddingBottom: 120, // Extended bottom space
    },
    memberCard: {
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
    avatarContainer: {
        marginRight: 10,
    },
    avatarGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: 'bold',
    },
    cardInfo: {
        flex: 1
    },
    memberName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 4
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    groupBadge: {
        backgroundColor: theme.colors.primaryLight + '15',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.s,
    },
    groupBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.primary,
        textTransform: 'uppercase',
    },
    detailsText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    pendingContainer: {
        alignItems: 'flex-end',
        paddingLeft: 8,
    },
    pendingLabel: {
        fontSize: 11,
        color: theme.colors.danger,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    pendingAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.danger,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    }
});
