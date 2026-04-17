import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme';
import api from '../services/api';

export default function HeaderActions() {
    const { selectedAcademicYearId, setSelectedAcademicYearId, user } = useContext(AuthContext);
    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        const fetchYears = async () => {
            try {
                setLoading(true);
                const res = await api.get('/academic-years');
                setYears(res.data);
            } catch (error) {
                console.error('Failed to load academic years for dropdown', error);
            } finally {
                setLoading(false);
            }
        };
        fetchYears();
    }, []);

    const selectedYear = years.find(y => y._id === selectedAcademicYearId);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
        );
    }

    if (years.length === 0) return null;
    if (user?.entityType === 'gym') return null;

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.dropdownText} numberOfLines={1}>
                    {selectedYear ? selectedYear.name : 'Select Year'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Academic Year</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={years}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.yearItem, selectedAcademicYearId === item._id && styles.yearItemSelected]}
                                    onPress={() => {
                                        setSelectedAcademicYearId(item._id);
                                        setModalVisible(false);
                                    }}
                                >
                                    <View>
                                        <Text style={[styles.yearName, selectedAcademicYearId === item._id && styles.yearNameSelected]}>
                                            {item.name}
                                        </Text>
                                        <Text style={styles.yearDates}>
                                            {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    {selectedAcademicYearId === item._id && (
                                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginRight: theme.spacing.m,
        justifyContent: 'center',
    },
    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary + '10',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.s,
        gap: 6,
        maxWidth: 140,
    },
    dropdownText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 14,
        flexShrink: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        overflow: 'hidden'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textPrimary
    },
    yearItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    yearItemSelected: {
        backgroundColor: theme.colors.primary + '05'
    },
    yearName: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        marginBottom: 4
    },
    yearNameSelected: {
        color: theme.colors.primary,
        fontWeight: '700'
    },
    yearDates: {
        fontSize: 13,
        color: theme.colors.textSecondary
    }
});
