import React, { useState, useEffect, useContext } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getTerm } from '../../utils/terminology';

export default function AddMemberScreen() {
    const { selectedAcademicYearId, user } = useContext(AuthContext);
    const navigation = useNavigation();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const scrollY = React.useRef(new Animated.Value(0)).current;

    const memberToEdit = route.params?.memberToEdit;
    const initialFeeGroupId = route.params?.feeGroupId;

    const [feeGroupId, setFeeGroupId] = useState(initialFeeGroupId || '');
    const [groupsList, setGroupsList] = useState<any[]>([]);
    const [addonFeeIds, setAddonFeeIds] = useState<string[]>(memberToEdit?.addonFeeIds || []);
    const [globalFees, setGlobalFees] = useState<any[]>([]);

    const [firstName, setFirstName] = useState(memberToEdit?.firstName || '');
    const [middleName, setMiddleName] = useState(memberToEdit?.middleName || '');
    const [lastName, setLastName] = useState(memberToEdit?.lastName || '');
    const [knownId, setKnownId] = useState(memberToEdit?.knownId || '');
    const [dobDate, setDobDate] = useState<Date | null>(memberToEdit?.dob ? new Date(memberToEdit.dob) : null);
    const [dobStr, setDobStr] = useState(memberToEdit?.dob ? String(memberToEdit.dob).split('T')[0] : '');
    const [showDobPicker, setShowDobPicker] = useState(false);
    const [contact, setContact] = useState(memberToEdit?.contact || '');
    const [altContact, setAltContact] = useState(memberToEdit?.altContact || '');
    const [fatherOccupation, setFatherOccupation] = useState(memberToEdit?.fatherOccupation || '');
    const [motherOccupation, setMotherOccupation] = useState(memberToEdit?.motherOccupation || '');
    const [address, setAddress] = useState(memberToEdit?.address || '');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!initialFeeGroupId && !memberToEdit) {
            Promise.all([
                api.get('/fee-groups'),
                api.get('/fee-structures')
            ]).then(([groupRes, structRes]) => {
                setGroupsList(groupRes.data);
                const globals = structRes.data.filter((s: any) => !s.feeGroupId);
                setGlobalFees(globals);
            }).catch(() => console.log('Failed to fetch data'));
        } else {
            api.get('/fee-structures').then(res => {
                const globals = res.data.filter((s: any) => !s.feeGroupId);
                setGlobalFees(globals);
            }).catch(() => console.log('Failed to fetch structures'));
        }
    }, [initialFeeGroupId, memberToEdit]);

    const handleCreate = async () => {
        const finalKnownId = (user?.entityType === 'gym' && !knownId) ? `GYM-${Date.now().toString().slice(-6)}` : knownId;

        if (!firstName || !lastName || !finalKnownId) {
            alert('First Name, Last Name, and Known ID are required');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                firstName, middleName, lastName, knownId: finalKnownId,
                dob: Platform.OS === 'web' ? dobStr : (dobDate ? dobDate.toISOString().split('T')[0] : ''), 
                contact, altContact, fatherOccupation,
                motherOccupation, address,
                addonFeeIds,
                ...(feeGroupId ? { feeGroupId, ...(user?.entityType !== 'gym' && selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {}) } : {})
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
        } catch (error: any) {
            alert(error.response?.data?.message || `Failed to save ${getTerm('Student', user?.entityType).toLowerCase()} details`);
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
                        {memberToEdit ? `Edit ${getTerm('Student', user?.entityType)}` : `Add ${getTerm('Student', user?.entityType)}`}
                    </Animated.Text>
                    <View style={{ width: 40 }} />
                </View>

                <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
                    <View style={styles.iconBg}>
                        <Ionicons name={memberToEdit ? "pencil" : "person-add"} size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.heroTitle}>{memberToEdit ? `Edit ${getTerm('Student', user?.entityType)}` : `Add New ${getTerm('Student', user?.entityType)}`}</Text>
                    <Text style={styles.heroSubtitle}>
                        {memberToEdit ? `Update records and details` : `Register a new ${getTerm('Student', user?.entityType).toLowerCase()} into the system`}
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
                        {user?.entityType !== 'gym' && (
                            <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={globalStyles.label}>{getTerm('Roll No', user?.entityType)} *</Text>
                                <TextInput
                                    style={globalStyles.input}
                                    placeholder="101"
                                    value={knownId}
                                    onChangeText={setKnownId}
                                    placeholderTextColor={theme.colors.textMuted}
                                />
                            </View>
                        )}
                        <View style={{ flex: user?.entityType !== 'gym' ? 1 : undefined, width: user?.entityType === 'gym' ? '100%' : undefined, paddingLeft: user?.entityType !== 'gym' ? 8 : 0 }}>
                            <Text style={globalStyles.label}>Date of Birth</Text>
                            {Platform.OS === 'web' ? (
                                <TextInput
                                    style={globalStyles.input}
                                    placeholder="YYYY-MM-DD"
                                    value={dobStr}
                                    onChangeText={(text) => {
                                        setDobStr(text);
                                        const parsedDate = new Date(text);
                                        if (!isNaN(parsedDate.getTime())) {
                                            setDobDate(parsedDate);
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

                {!memberToEdit && !initialFeeGroupId && user?.entityType !== 'gym' && groupsList.length > 0 && (
                    <View style={styles.glassCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="fitness-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>Membership Plan</Text>
                        </View>
                        <Text style={globalStyles.label}>Select Package</Text>
                        <View style={styles.mockPicker}>
                            {groupsList.map(g => (
                                <TouchableOpacity
                                    key={g._id}
                                    style={[styles.pill, feeGroupId === g._id && styles.pillActive]}
                                    onPress={() => setFeeGroupId(g._id)}
                                >
                                    <Text style={[styles.pillText, feeGroupId === g._id && styles.pillTextActive]}>{g.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {globalFees.length > 0 && (
                    <View style={styles.glassCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="cart-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>{user?.entityType === 'gym' ? 'Billing Plans' : 'Optional Add-Ons'}</Text>
                        </View>
                        <Text style={globalStyles.label}>{user?.entityType === 'gym' ? 'Select Subscriptions' : 'Select Extra Fees'}</Text>
                        <View style={styles.mockPicker}>
                            {globalFees.map(f => {
                                const isSelected = addonFeeIds.includes(f._id);
                                return (
                                    <TouchableOpacity
                                        key={f._id}
                                        style={[styles.pill, isSelected && styles.pillActive]}
                                        onPress={() => {
                                            if (isSelected) setAddonFeeIds(prev => prev.filter(id => id !== f._id));
                                            else setAddonFeeIds(prev => [...prev, f._id]);
                                        }}
                                    >
                                        <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{f.name} (₹{f.amount})</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

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

                {user?.entityType !== 'gym' && (
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
                )}

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
                            <Text style={globalStyles.submitButtonText}>{memberToEdit ? 'Save Changes' : `Register ${getTerm('Student', user?.entityType)}`}</Text>
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
    },
    mockPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    pill: {
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: theme.borderRadius.round,
        borderWidth: 1, borderColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },
    pillActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '15'
    },
    pillText: { color: theme.colors.textSecondary, fontWeight: '500', fontSize: 14 },
    pillTextActive: { color: theme.colors.primary, fontWeight: 'bold' }
});
