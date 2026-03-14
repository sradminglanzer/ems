import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function AddMemberScreen() {
    const { selectedAcademicYearId } = useContext(AuthContext);
    const navigation = useNavigation();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const scrollY = React.useRef(new Animated.Value(0)).current;

    const memberToEdit = route.params?.memberToEdit;
    const feeGroupId = route.params?.feeGroupId;

    const [firstName, setFirstName] = useState(memberToEdit?.firstName || '');
    const [middleName, setMiddleName] = useState(memberToEdit?.middleName || '');
    const [lastName, setLastName] = useState(memberToEdit?.lastName || '');
    const [knownId, setKnownId] = useState(memberToEdit?.knownId || '');
    const [dobDate, setDobDate] = useState<Date | null>(memberToEdit?.dob ? new Date(memberToEdit.dob) : null);
    const [showDobPicker, setShowDobPicker] = useState(false);
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
                dob: dobDate ? dobDate.toISOString().split('T')[0] : '', contact, altContact, fatherOccupation,
                motherOccupation, address,
                ...(feeGroupId && selectedAcademicYearId ? { feeGroupId, academicYearId: selectedAcademicYearId } : {})
            };

            if (memberToEdit) {
                // Update
                await api.put(`/members/${memberToEdit._id}`, payload);
            } else {
                // Create
                await api.post('/members', payload);
            }

            // Go back to the previous screen (Members list)
            navigation.goBack();
        } catch (error) {
            console.error('Error creating member:', error);
            alert('Failed to save student details');
        } finally {
            setIsSubmitting(false);
        }
    };

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [Platform.OS === 'ios' ? 200 : 180, Platform.OS === 'ios' ? 100 : 80],
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
        <KeyboardAvoidingView
            style={globalStyles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Animated.View style={[styles.animatedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={theme.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.surface} />
                    </TouchableOpacity>
                    <Animated.Text style={[styles.stickyTitle, { opacity: headerTitleOpacity }]}>
                        {memberToEdit ? 'Edit Student' : 'Add Student'}
                    </Animated.Text>
                    <View style={{ width: 40 }} />
                </View>

                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.iconBg}>
                        <Ionicons name={memberToEdit ? "pencil" : "person-add"} size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.heroTitle}>{memberToEdit ? 'Edit Student' : 'Add New Student'}</Text>
                    <Text style={styles.heroSubtitle}>
                        {memberToEdit ? 'Update student records and details' : 'Register a new student into the system'}
                    </Text>
                </Animated.View>
            </Animated.View>

            <Animated.ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >

                <View style={[styles.glassCard, { marginTop: -20 }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Personal Details</Text>
                    </View>

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

                    <View style={styles.row}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={globalStyles.label}>Roll No *</Text>
                            <TextInput
                                style={globalStyles.input}
                                placeholder="101"
                                value={knownId}
                                onChangeText={setKnownId}
                                placeholderTextColor={theme.colors.textMuted}
                            />
                        </View>
                        <View style={{ flex: 1, paddingLeft: 8 }}>
                            <Text style={globalStyles.label}>Date of Birth</Text>
                            {Platform.OS === 'web' ? (
                                <TextInput
                                    style={globalStyles.input}
                                    placeholder="YYYY-MM-DD"
                                    value={dobDate ? dobDate.toISOString().split('T')[0] : ''}
                                    onChangeText={(text) => {
                                        // Basic validation to accept valid date formats if entered manually
                                        const parsedDate = new Date(text);
                                        if (!isNaN(parsedDate.getTime())) {
                                            setDobDate(parsedDate);
                                        } else if (text === '') {
                                            setDobDate(null);
                                        }
                                    }}
                                    // @ts-ignore
                                    type="date"
                                    placeholderTextColor={theme.colors.textMuted}
                                />
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[globalStyles.input, { justifyContent: 'center' }]}
                                        onPress={() => setShowDobPicker(true)}
                                    >
                                        <Text style={{ color: dobDate ? theme.colors.textPrimary : theme.colors.textMuted }}>
                                            {dobDate ? dobDate.toISOString().split('T')[0] : "YYYY-MM-DD"}
                                        </Text>
                                    </TouchableOpacity>
                                    {showDobPicker ? (
                                        <DateTimePicker
                                            value={dobDate || new Date()}
                                            mode="date"
                                            display="default"
                                            onChange={(event, selectedDate) => {
                                                setShowDobPicker(Platform.OS === 'ios');
                                                if (selectedDate) setDobDate(selectedDate);
                                            }}
                                        />
                                    ) : null}
                                </>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.glassCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="call-outline" size={18} color={theme.colors.secondary} />
                        <Text style={styles.sectionTitle}>Contact Info</Text>
                    </View>

                    <Text style={globalStyles.label}>Contact No.</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="9876543210"
                        value={contact}
                        onChangeText={setContact}
                        keyboardType="phone-pad"
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={globalStyles.label}>Alternate Contact</Text>
                    <TextInput
                        style={globalStyles.input}
                        placeholder="9876543211"
                        value={altContact}
                        onChangeText={setAltContact}
                        keyboardType="phone-pad"
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

                <View style={styles.glassCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="people-circle-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Parent Details</Text>
                    </View>

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
                </View>

            </Animated.ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(theme.spacing.m, insets.bottom + 12) }]}>
                <TouchableOpacity
                    style={[globalStyles.submitButton, isSubmitting && globalStyles.disabledButton]}
                    onPress={handleCreate}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={theme.colors.surface} />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Ionicons name="save-outline" size={20} color={theme.colors.surface} />
                            <Text style={globalStyles.submitButtonText}>{memberToEdit ? 'Save Changes' : 'Register Student'}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        ...theme.shadows.sm,
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.l,
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
        height: Platform.OS === 'ios' ? 100 : 80,
        zIndex: 100,
    },
    stickyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.surface,
    },
    iconButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
        zIndex: 20,
    },
    heroContent: {
        alignItems: 'center',
        position: 'absolute',
        top: Platform.OS === 'ios' ? 90 : 70,
        left: 0,
        right: 0,
    },
    iconBg: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 8, ...theme.shadows.sm,
    },
    heroTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.surface, letterSpacing: 0.5 },
    heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '500' },

    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 220 : 200,
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.xxl,
        gap: theme.spacing.m,
    },
    glassCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.l,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '50',
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    footer: {
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        ...theme.shadows.md,
    }
});
