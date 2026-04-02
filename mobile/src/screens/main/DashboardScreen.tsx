import React, { useContext, useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions, Platform, Animated } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderActions from '../../components/HeaderActions';
import { getTerm } from '../../utils/terminology';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;

export default function DashboardScreen() {
    const navigation = useNavigation<any>();
    const { user, signOut, selectedAcademicYearId } = useContext(AuthContext);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchStats = async () => {
                try {
                    const params = selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {};
                    const response = await api.get('/dashboard/stats', { params });
                    setStats(response.data);
                } catch (e) {
                    console.error('Failed to load stats', e);
                } finally {
                    setLoading(false);
                }
            };
            fetchStats();
        }, [selectedAcademicYearId])
    );

    const scrollY = useRef(new Animated.Value(0)).current;

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [Platform.OS === 'ios' ? 220 : 180, Platform.OS === 'ios' ? 100 : 80],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const headerTitleOpacity = scrollY.interpolate({
        inputRange: [60, 100],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
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
                        Dashboard
                    </Animated.Text>
                    <HeaderActions />
                </View>
                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={styles.greetingText}>{user?.name}</Text>
                        <View style={styles.roleBadgeHero}>
                            <Text style={styles.roleTextHero}>{user?.role}</Text>
                        </View>
                    </View>
                    <View style={styles.avatarGlass}>
                        <Ionicons name="person" size={32} color={theme.colors.surface} />
                    </View>
                </Animated.View>
            </Animated.View>

            <Animated.ScrollView
                style={styles.contentArea}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 240 : 200, paddingBottom: 40 }}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
                ) : stats ? (
                    <View style={styles.dashboardBody}>

                        <View style={styles.sectionHeaderBox}>
                            <Text style={styles.sectionTitle}>Overview</Text>
                        </View>

                        {/* Horizontal Stat Carousel */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.carouselContainer}
                        >
                            <TouchableOpacity style={styles.glassCardSmall} activeOpacity={0.8} onPress={() => navigation.navigate('Students')}>
                                <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryLight + '20' }]}>
                                    <Ionicons name="people" size={24} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.statValueSmall}>{stats.totalMembers}</Text>
                                <Text style={styles.statLabelSmall}>Total {getTerm('Students', user?.entityType)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.glassCardSmall} activeOpacity={0.8} onPress={() => navigation.navigate('FeeGroups')}>
                                <View style={[styles.iconBox, { backgroundColor: theme.colors.secondaryLight + '30' }]}>
                                    <Ionicons name="school" size={24} color={theme.colors.secondary} />
                                </View>
                                <Text style={styles.statValueSmall}>{stats.totalFeeGroups}</Text>
                                <Text style={styles.statLabelSmall}>Active {getTerm('Classes', user?.entityType)}</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Financial Cards */}
                        {user?.role !== 'teacher' && (
                            <View style={styles.financeSection}>
                                <Text style={styles.sectionTitle}>Financials</Text>

                                <TouchableOpacity
                                    style={[styles.financeCard, { borderColor: theme.colors.dangerLight, borderWidth: 1 }]}
                                    activeOpacity={0.8}
                                    onPress={() => navigation.navigate('Students', { filter: 'pendingFees' })}
                                >
                                    <View style={styles.financeInfo}>
                                        <Text style={styles.financeLabel}>Pending Deficits</Text>
                                        <Text style={[styles.financeValue, { color: theme.colors.danger }]}>
                                            ₹{Math.max(0, stats.totalPendingAmount).toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                    <View style={[styles.iconBoxLarge, { backgroundColor: theme.colors.dangerLight + '40' }]}>
                                        <Ionicons name="alert-circle" size={32} color={theme.colors.danger} />
                                    </View>
                                </TouchableOpacity>

                                <View style={[styles.financeCard, { borderColor: theme.colors.successLight, borderWidth: 1 }]}>
                                    <View style={styles.financeInfo}>
                                        <Text style={styles.financeLabel}>Total Collection</Text>
                                        <Text style={[styles.financeValue, { color: theme.colors.success }]}>
                                            ₹{Math.max(0, stats.totalCollectedAmount).toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                    <View style={[styles.iconBoxLarge, { backgroundColor: theme.colors.successLight + '40' }]}>
                                        <Ionicons name="wallet" size={32} color={theme.colors.success} />
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Expiring Subscriptions List */}
                        {stats.expiringMembers && stats.expiringMembers.length > 0 && (
                            <View style={styles.financeSection}>
                                <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>Expiring Soon</Text>
                                {stats.expiringMembers.map((m: any) => (
                                    <TouchableOpacity 
                                        key={m._id} 
                                        style={[styles.financeCard, { borderColor: theme.colors.dangerLight, borderWidth: 1, marginTop: 8 }]}
                                        onPress={() => navigation.navigate('MemberDetails', { member: m })}
                                    >
                                        <View style={styles.financeInfo}>
                                            <Text style={[styles.financeLabel, { color: theme.colors.textPrimary, fontWeight: 'bold' }]}>{m.firstName} {m.lastName}</Text>
                                            <Text style={[styles.financeValue, { fontSize: 16, marginTop: 4, color: new Date(m.nextPaymentDate) < new Date() ? theme.colors.danger : theme.colors.warning }]}>
                                                Due: {new Date(m.nextPaymentDate).toLocaleDateString()}
                                            </Text>
                                            {m.contact && <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 }}>📞 {m.contact}</Text>}
                                        </View>
                                        <View style={[styles.iconBoxLarge, { backgroundColor: theme.colors.dangerLight + '20' }]}>
                                            <Ionicons name="time" size={28} color={theme.colors.danger} />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                    </View>
                ) : null}

                <TouchableOpacity style={styles.glassLogoutBtn} onPress={signOut}>
                    <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
                    <Text style={styles.logoutText}>Sign Out Securely</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
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
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
    },
    welcomeText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    greetingText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.surface,
        marginTop: 2,
        marginBottom: 8,
    },
    roleBadgeHero: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.round,
        alignSelf: 'flex-start',
    },
    roleTextHero: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: theme.colors.surface,
        letterSpacing: 0.5,
    },
    avatarGlass: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    contentArea: {
        flex: 1,
    },
    dashboardBody: {
        paddingHorizontal: theme.spacing.m,
    },
    sectionHeaderBox: {
        paddingHorizontal: theme.spacing.s,
        marginBottom: theme.spacing.s,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        letterSpacing: 0.5,
    },
    carouselContainer: {
        paddingHorizontal: theme.spacing.s,
        paddingBottom: theme.spacing.l,
        gap: theme.spacing.m,
    },
    glassCardSmall: {
        width: CARD_WIDTH,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.l,
        ...theme.shadows.md,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    statValueSmall: {
        fontSize: 26,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    statLabelSmall: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        marginTop: 4,
    },
    financeSection: {
        marginTop: theme.spacing.m,
        paddingHorizontal: theme.spacing.s,
    },
    financeCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.l,
        ...theme.shadows.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.m,
    },
    financeInfo: {
        flex: 1,
    },
    financeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    financeValue: {
        fontSize: 26,
        fontWeight: 'bold',
        marginTop: 6,
    },
    iconBoxLarge: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glassLogoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        paddingVertical: 18,
        marginHorizontal: theme.spacing.l,
        marginTop: theme.spacing.xl,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.dangerLight,
        ...theme.shadows.sm,
    },
    logoutText: {
        color: theme.colors.danger,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    }
});
