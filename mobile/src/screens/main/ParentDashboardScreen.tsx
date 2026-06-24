import React, { useContext, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform, Animated } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import HeaderActions from '../../components/HeaderActions';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';

export default function ParentDashboardScreen() {
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

                {/* Top Nav Bar */}
                <View style={styles.topNav}>
                    <View style={styles.headerTitleContainer}>
                        <Ionicons name="school" size={24} color={theme.colors.surface} />
                        <Animated.Text style={[styles.headerTitle, { opacity: headerTitleOpacity }]}>Parent Portal</Animated.Text>
                    </View>
                    <View style={styles.headerActionsWrapper}>
                        <HeaderActions />
                    </View>
                </View>

                {/* Hero Profile */}
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
                contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 260 : 220, paddingBottom: 40 }}
            >

                <View style={styles.sectionHeaderBox}>
                    <Text style={styles.sectionTitle}>Your Enrolled Children</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
                ) : stats && stats.isParent ? (
                    <View style={styles.listContainer}>
                        {stats.children && stats.children.map((child: any) => (
                            <TouchableOpacity
                                key={child._id}
                                style={[styles.childCard, child.pendingAmount > 0 ? { borderColor: theme.colors.dangerLight } : { borderColor: theme.colors.border }]}
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('MemberDetails', { member: child })}
                            >
                                <View style={styles.childInfoContainer}>
                                    <View style={[styles.avatarSmall, { backgroundColor: theme.colors.primaryLight + '20' }]}>
                                        <Text style={styles.avatarText}>{child.firstName.charAt(0)}{child.lastName.charAt(0)}</Text>
                                    </View>
                                    <View style={styles.childTextContent}>
                                        <Text style={styles.childName}>{child.firstName} {child.lastName}</Text>
                                        <View style={styles.groupBadge}>
                                            <Text style={[styles.groupBadgeText, { color: theme.colors.primary }]}>
                                                {child.groupName || 'Student'}
                                            </Text>
                                        </View>
                                        {child.pendingAmount > 0 ? (
                                            <Text style={styles.pendingText}>Pending: ₹{child.pendingAmount.toLocaleString('en-IN')}</Text>
                                        ) : (
                                            <Text style={styles.paidText}>Fees Clear</Text>
                                        )}
                                        {child.nextPaymentDate && (
                                            <Text style={[
                                                styles.paidText, 
                                                { 
                                                    color: new Date(child.nextPaymentDate) < new Date() ? theme.colors.danger : theme.colors.textSecondary, 
                                                    marginTop: 4, 
                                                    fontWeight: '500' 
                                                }
                                            ]}>
                                                Renewal: {new Date(child.nextPaymentDate).toLocaleDateString()}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color={theme.colors.textMuted} />
                            </TouchableOpacity>
                        ))}
                        {stats.children && stats.children.length === 0 && (
                            <View style={globalStyles.centerMode}>
                                <Text style={globalStyles.emptyText}>No children found.</Text>
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
        paddingHorizontal: theme.spacing.l,
        height: Platform.OS === 'ios' ? 100 : 80,
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.surface,
        letterSpacing: 0.5,
    },
    headerActionsWrapper: {
        backgroundColor: 'rgba(255,255,255,0.9)', // Wrap header actions to make dropdown visible against gradient
        borderRadius: theme.borderRadius.s,
        padding: 4,
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
    sectionHeaderBox: {
        paddingHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.m,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        letterSpacing: 0.5,
    },
    listContainer: {
        paddingHorizontal: theme.spacing.m,
        gap: theme.spacing.m,
    },
    childCard: {
        backgroundColor: theme.colors.surface,
        padding: 12,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        ...theme.shadows.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    childInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
        letterSpacing: 1,
    },
    childTextContent: {
        flex: 1,
    },
    childName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    groupBadge: {
        backgroundColor: theme.colors.primaryLight + '15',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.s,
        marginBottom: 8,
    },
    groupBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    pendingText: {
        color: theme.colors.danger,
        fontWeight: '700',
        fontSize: 14,
    },
    paidText: {
        color: theme.colors.success,
        fontWeight: '600',
        fontSize: 14,
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
