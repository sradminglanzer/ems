import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated, Image, Modal, Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { getUploadUrl } from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getTerm } from '../../utils/terminology';
import { generateAndShareInvoice } from '../../utils/InvoiceGenerator';

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

    const [profilePicUrl, setProfilePicUrl] = useState(memberToEdit?.profilePicUrl || '');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successModalData, setSuccessModalData] = useState<any | null>(null);

    // POS Onboarding States
    const [posPaymentMethod, setPosPaymentMethod] = useState('cash');
    const [posAmountCollected, setPosAmountCollected] = useState('');
    const [posNextRenewalDateStr, setPosNextRenewalDateStr] = useState('');
    const [posNextRenewalDate, setPosNextRenewalDate] = useState<Date | null>(null);
    const [showPosRenewalPicker, setShowPosRenewalPicker] = useState(false);
    const [posReferenceDocumentUrl, setPosReferenceDocumentUrl] = useState('');
    const [isUploadingProof, setIsUploadingProof] = useState(false);

    useEffect(() => {
        if (user?.entityType === 'gym' && !memberToEdit) {
            const selectedFees = globalFees.filter(f => addonFeeIds.includes(f._id));
            const total = selectedFees.reduce((sum, f) => sum + f.amount, 0);
            if (total > 0) {
                setPosAmountCollected(total.toString());
            } else {
                setPosAmountCollected('');
            }
        }
    }, [addonFeeIds, globalFees, user?.entityType]);

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

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets[0]) {
                const imgUri = result.assets[0].uri;
                setIsUploadingPhoto(true);

                // 1) Get secure presigned URL
                const ext = imgUri.split('.').pop() || 'jpg';
                const filename = `avatar.${ext}`;
                const urlRes = await getUploadUrl(filename, 'image/jpeg');
                const { uploadUrl, publicUrl } = urlRes.data;

                // 2) Convert local URI to Blob
                const response = await fetch(imgUri);
                const blob = await response.blob();

                // 3) PUT directly to S3
                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: blob,
                    headers: { 'Content-Type': 'image/jpeg' },
                });

                // 4) Set successful URL
                setProfilePicUrl(publicUrl);
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('Failed to upload image securely.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handlePickProof = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.6,
            });

            if (!result.canceled && result.assets[0]) {
                const imgUri = result.assets[0].uri;
                setIsUploadingProof(true);

                const ext = imgUri.split('.').pop() || 'jpg';
                const filename = `proof-${Date.now()}.${ext}`;
                const urlRes = await getUploadUrl(filename, 'image/jpeg');
                const { uploadUrl, publicUrl } = urlRes.data;

                const response = await fetch(imgUri);
                const blob = await response.blob();

                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: blob,
                    headers: { 'Content-Type': 'image/jpeg' },
                });

                setPosReferenceDocumentUrl(publicUrl);
            }
        } catch (error) {
            console.error('Failed to upload proof:', error);
            alert('Failed to upload payment proof securely.');
        } finally {
            setIsUploadingProof(false);
        }
    };

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
                profilePicUrl,
                ...(feeGroupId ? { feeGroupId, ...(user?.entityType !== 'gym' && selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {}) } : {}),
                ...(user?.entityType === 'gym' && !memberToEdit && posAmountCollected ? {
                    initialPayment: {
                        amount: Number(posAmountCollected),
                        paymentMethod: posPaymentMethod,
                        nextPaymentDateStr: posNextRenewalDateStr || (posNextRenewalDate ? posNextRenewalDate.toISOString().split('T')[0] : ''),
                        referenceDocumentUrl: posReferenceDocumentUrl
                    }
                } : {})
            };

            if (memberToEdit) {
                // Update
                await api.put(`/members/${memberToEdit._id}`, payload);
                navigation.goBack();
            } else {
                // Create
                const response = await api.post('/members', payload);
                const assignedReceiptNo = response.data?.receiptNo || `REC-${Date.now().toString().slice(-6)}`;
                
                // Trigger Receipt Generation
                if (user?.entityType === 'gym' && posAmountCollected && Number(posAmountCollected) > 0) {
                    const selectedFees = globalFees.filter(f => addonFeeIds.includes(f._id));
                    setSuccessModalData({
                        receiptNo: assignedReceiptNo,
                        date: new Date(),
                        member: {
                            name: `${firstName} ${lastName}`.trim(),
                            knownId: finalKnownId,
                            contact: contact || 'N/A'
                        },
                        gymName: user?.entityName || 'Gym',
                        items: selectedFees.map((f: any) => ({ description: f.name, amount: f.amount })),
                        totalPaid: Number(posAmountCollected),
                        paymentMethod: posPaymentMethod,
                        nextRenewalDate: posNextRenewalDateStr ? new Date(posNextRenewalDateStr) : (posNextRenewalDate || undefined)
                    });
                } else {
                    navigation.goBack();
                }
            }
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
                    <TouchableOpacity style={styles.iconBg} onPress={handlePickImage} disabled={isUploadingPhoto}>
                        {isUploadingPhoto ? (
                            <ActivityIndicator color={theme.colors.primary} />
                        ) : profilePicUrl ? (
                            <Image source={{ uri: profilePicUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} />
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <Ionicons name={"camera"} size={22} color={theme.colors.primary} />
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Ionicons name="pencil" size={12} color={theme.colors.surface} />
                        </View>
                    </TouchableOpacity>
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

                {user?.entityType === 'gym' && addonFeeIds.length > 0 && !memberToEdit && (
                    <View style={styles.glassCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="card-outline" size={18} color={theme.colors.success} />
                            <Text style={styles.sectionTitle}>Initial POS Payment</Text>
                        </View>
                        
                        <Text style={globalStyles.label}>Amount Collected (₹)</Text>
                        <TextInput
                            style={[globalStyles.input, { borderColor: theme.colors.success + '50', borderWidth: 1 }]}
                            placeholder="0"
                            keyboardType="numeric"
                            value={posAmountCollected}
                            onChangeText={setPosAmountCollected}
                            placeholderTextColor={theme.colors.textMuted}
                        />

                        <Text style={globalStyles.label}>Payment Method</Text>
                        <View style={styles.mockPicker}>
                            {['cash', 'upi', 'card'].map(method => (
                                <TouchableOpacity
                                    key={method}
                                    style={[styles.pill, posPaymentMethod === method && { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '15' }]}
                                    onPress={() => setPosPaymentMethod(method)}
                                >
                                    <Text style={[styles.pillText, posPaymentMethod === method && { color: theme.colors.success, fontWeight: 'bold' }]}>{method.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={globalStyles.label}>Next Renewal Date</Text>
                        <View style={{ marginBottom: 12 }}>
                            {Platform.OS === 'web' ? (
                                <TextInput
                                    style={globalStyles.input}
                                    placeholder="YYYY-MM-DD"
                                    value={posNextRenewalDateStr}
                                    onChangeText={(text) => {
                                        setPosNextRenewalDateStr(text);
                                        const parsedDate = new Date(text);
                                        if (!isNaN(parsedDate.getTime())) {
                                            setPosNextRenewalDate(parsedDate);
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
                                        onPress={() => setShowPosRenewalPicker(true)}
                                    >
                                        <Text style={{ color: posNextRenewalDate ? theme.colors.textPrimary : theme.colors.textMuted }}>
                                            {posNextRenewalDate ? posNextRenewalDate.toISOString().split('T')[0] : "Select Expiry Date"}
                                        </Text>
                                    </TouchableOpacity>
                                    {showPosRenewalPicker ? (
                                        <DateTimePicker
                                            value={posNextRenewalDate || new Date()}
                                            mode="date"
                                            display="default"
                                            onChange={(event, selectedDate) => {
                                                setShowPosRenewalPicker(Platform.OS === 'ios');
                                                if (selectedDate) setPosNextRenewalDate(selectedDate);
                                            }}
                                        />
                                    ) : null}
                                </>
                            )}
                        </View>

                        {(posPaymentMethod === 'upi' || posPaymentMethod === 'card') && (
                            <View>
                                <Text style={globalStyles.label}>Upload Payment Proof</Text>
                                <TouchableOpacity style={[styles.pill, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }]} onPress={handlePickProof} disabled={isUploadingProof}>
                                    <Ionicons name={posReferenceDocumentUrl ? "checkmark-circle" : "cloud-upload-outline"} size={20} color={posReferenceDocumentUrl ? theme.colors.success : theme.colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.pillText, posReferenceDocumentUrl && { color: theme.colors.success, fontWeight: 'bold' }]}>
                                        {isUploadingProof ? "Uploading..." : posReferenceDocumentUrl ? "Proof Uploaded" : "Attach Screenshot"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
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

            {/* Payment Success Modal */}
            <Modal animationType="fade" transparent={true} visible={!!successModalData} onRequestClose={() => {
                setSuccessModalData(null);
                navigation.goBack();
            }}>
                <View style={globalStyles.modalOverlay}>
                    <View style={[globalStyles.modalContent, { alignItems: 'center', paddingVertical: 32 }]}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.success + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 8 }}>Payment Successful!</Text>
                        <Text style={{ fontSize: 16, color: theme.colors.textSecondary, marginBottom: 24 }}>Amount: ₹{successModalData?.totalPaid}  |  #{successModalData?.receiptNo}</Text>

                        <View style={{ width: '100%', gap: 12 }}>
                            <TouchableOpacity style={[globalStyles.submitButton, { backgroundColor: theme.colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]} onPress={() => {
                                generateAndShareInvoice(successModalData);
                            }}>
                                <Ionicons name="print-outline" size={20} color={theme.colors.surface} />
                                <Text style={globalStyles.submitButtonText}>Print / Save Receipt</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[globalStyles.submitButton, { backgroundColor: '#25D366', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]} onPress={() => {
                                const msg = `Hello ${successModalData?.member?.name},\nYour registration and payment of ₹${successModalData?.totalPaid} for ${successModalData?.gymName} is successful. Receipt No: ${successModalData?.receiptNo}. Welcome!`;
                                Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {
                                    alert('WhatsApp is not installed on your device.');
                                });
                            }}>
                                <Ionicons name="logo-whatsapp" size={20} color={theme.colors.surface} />
                                <Text style={globalStyles.submitButtonText}>Share via WhatsApp</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[globalStyles.submitButton, { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border }]} onPress={() => {
                                setSuccessModalData(null);
                                navigation.goBack();
                            }}>
                                <Text style={[globalStyles.submitButtonText, { color: theme.colors.textPrimary }]}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        top: Platform.OS === 'ios' ? 70 : 50,
        left: 0,
        right: 0,
    },
    iconBg: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 8, ...theme.shadows.sm,
    },
    editBadge: {
        position: 'absolute', bottom: -2, right: -2,
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: theme.colors.surface
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
