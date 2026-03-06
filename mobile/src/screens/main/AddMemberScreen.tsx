import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';

export default function AddMemberScreen() {
    const { selectedAcademicYearId } = useContext(AuthContext);
    const navigation = useNavigation();
    const route = useRoute<any>();

    const memberToEdit = route.params?.memberToEdit;
    const feeGroupId = route.params?.feeGroupId;

    const [firstName, setFirstName] = useState(memberToEdit?.firstName || '');
    const [middleName, setMiddleName] = useState(memberToEdit?.middleName || '');
    const [lastName, setLastName] = useState(memberToEdit?.lastName || '');
    const [knownId, setKnownId] = useState(memberToEdit?.knownId || '');
    const [dob, setDob] = useState(memberToEdit?.dob || '');
    const [contact, setContact] = useState(memberToEdit?.contact || '');
    const [altContact, setAltContact] = useState(memberToEdit?.altContact || '');
    const [fatherOccupation, setFatherOccupation] = useState(memberToEdit?.fatherOccupation || '');
    const [motherOccupation, setMotherOccupation] = useState(memberToEdit?.motherOccupation || '');
    const [address, setAddress] = useState(memberToEdit?.address || '');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreate = async () => {
        if (!firstName || !lastName || !knownId) {
            alert('First Name, Last Name, and Known ID are required');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                firstName, middleName, lastName, knownId,
                dob, contact, altContact, fatherOccupation,
                motherOccupation, address
            };

            if (memberToEdit) {
                // Update
                await api.put(`/members/${memberToEdit._id}`, payload);
            } else {
                // Create
                const response = await api.post('/members', payload);
                const newMemberId = response.data.insertedId;

                // If feeGroupId is passed, we also need to push the member id to the fee group
                if (feeGroupId && newMemberId && selectedAcademicYearId) {
                    const groupResp = await api.get('/fee-groups');
                    const group = groupResp.data.find((g: any) => g._id === feeGroupId);
                    if (group) {
                        let currentRosterMembers: string[] = [];
                        if (group.yearlyRosters && Array.isArray(group.yearlyRosters)) {
                            const roster = group.yearlyRosters.find((r: any) => r.academicYearId === selectedAcademicYearId);
                            if (roster && roster.members) {
                                currentRosterMembers = roster.members;
                            }
                        }
                        const updatedMembers = [...currentRosterMembers, newMemberId];
                        await api.put(`/fee-groups/${feeGroupId}`, { members: updatedMembers, academicYearId: selectedAcademicYearId });
                    }
                }
            }

            // Go back to the previous screen (Members list)
            navigation.goBack();
        } catch (error) {
            console.error('Error creating member:', error);
            alert('Failed to create member');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={globalStyles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{memberToEdit ? 'Edit Student' : 'Add Student'}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.formContainer}>
                    <Text style={globalStyles.label}>First Name *</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="John"
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={globalStyles.label}>Middle Name</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="Quincy"
                        value={middleName}
                        onChangeText={setMiddleName}
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={globalStyles.label}>Last Name *</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="Doe"
                        value={lastName}
                        onChangeText={setLastName}
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={globalStyles.label}>Known ID (Roll No) *</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="101"
                        value={knownId}
                        onChangeText={setKnownId}
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={globalStyles.label}>Date of Birth</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="YYYY-MM-DD"
                        value={dob}
                        onChangeText={setDob}
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={globalStyles.label}>Contact No.</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="9876543210"
                        value={contact}
                        onChangeText={setContact}
                        keyboardType="phone-pad"
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={globalStyles.label}>Alternate Contact No.</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="9876543211"
                        value={altContact}
                        onChangeText={setAltContact}
                        keyboardType="phone-pad"
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={globalStyles.label}>Father's Occupation</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="e.g. Engineer"
                        value={fatherOccupation}
                        onChangeText={setFatherOccupation}
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={globalStyles.label}>Mother's Occupation</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="e.g. Doctor"
                        value={motherOccupation}
                        onChangeText={setMotherOccupation}
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={globalStyles.label}>Address</Text>
                    <TextInput
                        style={[globalStyles.input, { height: 80, textAlignVertical: 'top' }]}
                        placeholder="123 Main St..."
                        value={address}
                        onChangeText={setAddress}
                        multiline
                        placeholderTextColor={theme.colors.textMuted}
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]}
                    onPress={handleCreate}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={theme.colors.surface} />
                    ) : (
                        <Text style={globalStyles.submitButtonText}>{memberToEdit ? 'Update Student' : 'Add Student'}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
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
    backButton: {
        padding: theme.spacing.xs,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    scrollContent: {
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.xxl,
    },
    formContainer: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.l,
        ...theme.shadows.sm,
    },
    mockPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.l
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.round,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },
    pillActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10'
    },
    pillText: {
        color: theme.colors.textSecondary,
        fontWeight: '500'
    },
    pillTextActive: {
        color: theme.colors.primary,
        fontWeight: '600'
    },
    footer: {
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingBottom: Platform.OS === 'ios' ? 32 : theme.spacing.m,
    }
});
