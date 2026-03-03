import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export default function ExamsScreen() {
    const navigation = useNavigation<any>();
    const [examsList, setExamsList] = useState<any[]>([]);
    const [feeGroups, setFeeGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [examsRes, groupsRes] = await Promise.all([
                api.get('/exams'),
                api.get('/fee-groups')
            ]);
            setExamsList(examsRes.data);
            setFeeGroups(groupsRes.data);
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
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getGroupName = (groupId: string) => {
        const group = feeGroups.find(g => g._id === groupId);
        return group ? group.name : 'Unknown Group';
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={globalStyles.card} activeOpacity={0.7} onPress={() => navigation.navigate('ExamDetails', { exam: item })}>
            <View style={styles.cardInfo}>
                <Text style={styles.examName}>{item.name}</Text>
                <Text style={styles.examDates}>{item.startDate} to {item.endDate}</Text>
                <Text style={styles.subjectsCount}>{item.subjects?.length || 0} Subjects</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.border} />
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
                    data={examsList}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={globalStyles.listContainer}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <Text style={globalStyles.emptyText}>No exams scheduled yet.</Text>
                    }
                />
            )}

            <TouchableOpacity style={globalStyles.fab} onPress={() => navigation.navigate('CreateExam')} activeOpacity={0.8}>
                <Ionicons name="add" size={32} color={theme.colors.surface} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    cardInfo: { flex: 1, paddingRight: 8 },
    examName: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
    examDates: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 4 },
    subjectsCount: { fontSize: 13, color: theme.colors.primary, fontWeight: '500' },
    groupBadge: {
        backgroundColor: theme.colors.secondary + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.s
    },
    groupBadgeText: {
        color: theme.colors.secondary,
        fontSize: 12,
        fontWeight: '600'
    }
});
