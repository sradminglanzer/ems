import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';

export default function DashboardScreen() {
    const navigation = useNavigation<any>();
    const { user, signOut } = useContext(AuthContext);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchStats = async () => {
                try {
                    const response = await api.get('/dashboard/stats');
                    setStats(response.data);
                } catch (e) {
                    console.error('Failed to load stats', e);
                } finally {
                    setLoading(false);
                }
            };
            fetchStats();
        }, [])
    );

    return (
        <View style={styles.container}>
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
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
                ) : stats && (
                    <View style={styles.statsGrid}>
                        <TouchableOpacity style={styles.statCard} activeOpacity={0.8} onPress={() => navigation.navigate('Students')}>
                            <Ionicons name="people-outline" size={32} color={theme.colors.primary} />
                            <Text style={styles.statValue}>{stats.totalMembers}</Text>
                            <Text style={styles.statLabel}>Students</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statCard} activeOpacity={0.8} onPress={() => navigation.navigate('FeeGroups')}>
                            <Ionicons name="albums-outline" size={32} color={theme.colors.primary} />
                            <Text style={styles.statValue}>{stats.totalFeeGroups}</Text>
                            <Text style={styles.statLabel}>Groups</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.wideStatCard} activeOpacity={0.8} onPress={() => navigation.navigate('Students', { filter: 'pendingFees' })}>
                            <View>
                                <Text style={styles.wideStatLabel}>Pending Collection</Text>
                                <Text style={[styles.wideStatValue, { color: theme.colors.danger }]}>
                                    ₹{Math.max(0, stats.totalPendingAmount)}
                                </Text>
                            </View>
                            <Ionicons name="alert-circle-outline" size={40} color={theme.colors.danger} />
                        </TouchableOpacity>
                        <View style={styles.wideStatCard}>
                            <View>
                                <Text style={styles.wideStatLabel}>Total Received</Text>
                                <Text style={[styles.wideStatValue, { color: theme.colors.primary }]}>
                                    ₹{Math.max(0, stats.totalCollectedAmount)}
                                </Text>
                            </View>
                            <Ionicons name="checkmark-circle-outline" size={40} color={theme.colors.primary} />
                        </View>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
                <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.m,
    },
    headerCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        flexDirection: 'row',
        alignItems: 'center',
        ...theme.shadows.md,
        marginTop: theme.spacing.s,
        fontWeight: '600',
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
    headerTextContainer: {
        flex: 1,
    },
    welcome: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        alignItems: 'center',
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
        marginTop: theme.spacing.l,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.m,
        justifyContent: 'space-between'
    },
    statCard: {
        width: '47%',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.m,
        ...theme.shadows.sm,
        alignItems: 'center'
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
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginTop: 8
    },
    statLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4
    },
    wideStatValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginTop: 4
    },
    wideStatLabel: {
        fontSize: 16,
        color: theme.colors.textSecondary
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.danger + '10',
        paddingVertical: 16,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.xl,
    },
    logoutText: {
        color: theme.colors.danger,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    }
});
