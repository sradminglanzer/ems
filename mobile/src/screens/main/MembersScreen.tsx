import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Platform
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useMemo } from 'react';

export default function MembersScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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

    const onRefresh = () => {
        setRefreshing(true);
        loadMembers();
    };

    const displayedMembers = useMemo(() => {
        if (route.params?.filter === 'pendingFees') {
            return members
                .filter((m: any) => (m.pendingAmount || 0) > 0)
                .sort((a: any, b: any) => (b.pendingAmount || 0) - (a.pendingAmount || 0));
        }
        return members;
    }, [members, route.params?.filter]);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={globalStyles.card} onPress={() => navigation.navigate('MemberDetails', { member: item })}>
            <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.groupBadge}>{item.groupName || 'Unassigned'}</Text>
                <Text style={styles.details}>Roll No: {item.knownId}</Text>
                {item.contact && <Text style={styles.details}>Contact: {item.contact}</Text>}
            </View>
            {route.params?.filter === 'pendingFees' && (
                <View style={{ justifyContent: 'center', alignItems: 'flex-end', paddingLeft: 8 }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 }}>Pending</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.danger }}>₹{item.pendingAmount}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={globalStyles.container}>
            {loading ? (
                <View style={globalStyles.centerMode}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={displayedMembers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={globalStyles.listContainer}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <Text style={globalStyles.emptyText}>No students added yet.</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cardInfo: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 4 },
    groupBadge: { fontSize: 12, fontWeight: '600', color: theme.colors.primary, marginBottom: 4, textTransform: 'uppercase' },
    details: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 2 },
});
