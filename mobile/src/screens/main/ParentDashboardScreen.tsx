import React, { useContext, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import HeaderActions from '../../components/HeaderActions';

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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Ionicons name="school" size={28} color={theme.colors.primary} />
                    <Text style={styles.headerTitle}>Parent Portal</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <HeaderActions />
                    <TouchableOpacity onPress={signOut} style={styles.logoutIcon}>
                        <Ionicons name="log-out-outline" size={24} color={theme.colors.danger} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.headerCard}>
                <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.welcome}>Welcome back,</Text>
                    <Text style={styles.greeting}>{user?.name}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user?.role}</Text>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.contentArea}>
                <Text style={styles.sectionHeader}>Your Enrolled Children</Text>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
                ) : stats && stats.isParent ? (
                    <View style={styles.statsGrid}>
                        {stats.children && stats.children.map((child: any) => (
                            <TouchableOpacity key={child._id} style={styles.wideStatCard} activeOpacity={0.8} onPress={() => navigation.navigate('MemberDetails', { member: child })}>
                                <View>
                                    <Text style={styles.wideStatLabel}>{child.firstName} {child.lastName}</Text>
                                    <Text style={[styles.statLabel, { color: theme.colors.primary }]}>
                                        {child.groupName || 'Student'}
                                    </Text>
                                    {child.pendingAmount > 0 ? (
                                        <Text style={{ color: theme.colors.danger, marginTop: 4, fontWeight: 'bold' }}>Pending Fee: ₹{child.pendingAmount}</Text>
                                    ) : (
                                        <Text style={{ color: theme.colors.primary, marginTop: 4, fontWeight: 'bold' }}>Fees Paid</Text>
                                    )}
                                </View>
                                <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                        {stats.children && stats.children.length === 0 && (
                            <View style={globalStyles.centerMode}>
                                <Text style={globalStyles.emptyText}>No children found.</Text>
                            </View>
                        )}
                    </View>
                ) : null}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
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
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    logoutIcon: {
        padding: 4,
    },
    headerCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        flexDirection: 'row',
        alignItems: 'center',
        ...theme.shadows.md,
        margin: theme.spacing.m,
        marginBottom: 0,
        textTransform: 'uppercase',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primaryLight + '30', // Semi-transparent
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    welcome: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    greeting: {
        fontSize: 24,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    roleBadge: {
        backgroundColor: theme.colors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.round,
        alignSelf: 'flex-start',
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        color: theme.colors.primary,
    },
    contentArea: {
        flex: 1,
        padding: theme.spacing.m,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
    },
    statsGrid: {
        flexDirection: 'column',
        gap: theme.spacing.m,
        paddingBottom: theme.spacing.xl,
    },
    wideStatCard: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.m,
        ...theme.shadows.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    statLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4
    },
    wideStatLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary
    }
});
