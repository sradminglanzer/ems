import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api, { getUploadUrl } from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { user, signIn } = useContext(AuthContext);

    // Invoice Sequence
    const [sequence, setSequence] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Logo Upload
    const [logoPreview, setLogoPreview] = useState<string | null>(user?.entityLogoUrl || null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const handleUpdateSequence = async () => {
        if (!sequence || isNaN(Number(sequence))) {
            return Platform.OS === 'web' ? alert('Enter a valid numeric sequence.') : Alert.alert('Invalid', 'Enter a valid numeric sequence.');
        }

        setSubmitting(true);
        try {
            await api.put('/fee-payments/sequence', { nextSequence: Number(sequence) });
            const msg = `Your next invoice will now be generated as REC-${String(sequence).padStart(4, '0')}`;
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
            setSequence('');
        } catch (error: any) {
            const err = error.response?.data?.message || 'Error updating sequence';
            Platform.OS === 'web' ? alert(err) : Alert.alert('Error', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePickLogo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                const imgUri = result.assets[0].uri;
                setIsUploadingLogo(true);

                // 1) Get presigned URL with type=logo
                const ext = imgUri.split('.').pop() || 'png';
                const filename = `logo.${ext}`;
                const urlRes = await getUploadUrl(filename, 'image/png', 'logo');
                const { uploadUrl, publicUrl } = urlRes.data;

                // 2) Upload to S3
                const response = await fetch(imgUri);
                const blob = await response.blob();
                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: blob,
                    headers: { 'Content-Type': 'image/png' },
                });

                // 3) Update entity logo on server
                await api.put('/entities/logo', { logoUrl: publicUrl });

                // 4) Update local context
                setLogoPreview(publicUrl);
                if (user) {
                    const updatedUser = { ...user, entityLogoUrl: publicUrl };
                    const token = await AsyncStorage.getItem('userToken');
                    if (token) {
                        await signIn(token, updatedUser);
                    }
                }

                const msg = 'Your business logo has been updated successfully!';
                Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
            }
        } catch (error: any) {
            console.error('Failed to upload logo:', error);
            const err = error.response?.data?.message || 'Failed to upload logo. Please try again.';
            Platform.OS === 'web' ? alert(err) : Alert.alert('Error', err);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient
                colors={theme.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 40 : 10 }]}
            >
                <SafeAreaView edges={['top', 'left', 'right']} style={{ paddingBottom: 16 }}>
                    <View style={styles.topNav}>
                        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconButton}>
                            <Ionicons name="menu" size={24} color={theme.colors.surface} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Business Settings</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Business Logo Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.secondaryLight + '30' }]}>
                            <Ionicons name="image-outline" size={24} color={theme.colors.secondary} />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.cardTitle}>Business Logo</Text>
                            <Text style={styles.cardDesc}>Upload your business logo. It will appear on the login screen and navigation menu.</Text>
                        </View>
                    </View>

                    <View style={styles.logoSection}>
                        <View style={styles.logoPreviewContainer}>
                            {isUploadingLogo ? (
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                            ) : logoPreview ? (
                                <Image source={{ uri: logoPreview }} style={styles.logoPreviewImage} resizeMode="contain" />
                            ) : (
                                <View style={styles.logoPlaceholder}>
                                    <Ionicons name="business-outline" size={40} color={theme.colors.textMuted} />
                                    <Text style={styles.logoPlaceholderText}>No Logo</Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[globalStyles.submitButton, { marginTop: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]}
                            onPress={handlePickLogo}
                            disabled={isUploadingLogo}
                        >
                            <Ionicons name={logoPreview ? "camera-outline" : "cloud-upload-outline"} size={20} color={theme.colors.surface} />
                            <Text style={globalStyles.submitButtonText}>{logoPreview ? 'Change Logo' : 'Upload Logo'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Invoice Sequence Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryLight + '30' }]}>
                            <Ionicons name="receipt-outline" size={24} color={theme.colors.primary} />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.cardTitle}>Invoice Sequence</Text>
                            <Text style={styles.cardDesc}>Set the starting number for your next auto-generated receipt.</Text>
                        </View>
                    </View>

                    <Text style={[globalStyles.label, { marginTop: 20 }]}>Next Receipt Number</Text>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.prefix}>REC -</Text>
                        <TextInput
                            style={styles.sequenceInput}
                            keyboardType="numeric"
                            placeholder="e.g. 500"
                            value={sequence}
                            onChangeText={setSequence}
                        />
                    </View>
                    <Text style={styles.helperText}>If you set this to 500, the next payment will generate REC-0500.</Text>

                    <TouchableOpacity 
                        style={[globalStyles.submitButton, { marginTop: 24 }, submitting && globalStyles.disabledButton]} 
                        onPress={handleUpdateSequence} 
                        disabled={submitting}
                    >
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.submitButtonText}>Update Sequence</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        ...theme.shadows.md,
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.m,
    },
    iconButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.surface,
    },
    content: {
        padding: theme.spacing.m,
        paddingTop: 24,
        gap: 20,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        ...theme.shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    cardDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 4,
        lineHeight: 18,
    },
    logoSection: {
        marginTop: 20,
        alignItems: 'center',
    },
    logoPreviewContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    logoPreviewImage: {
        width: 110,
        height: 110,
        borderRadius: 55,
    },
    logoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoPlaceholderText: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 4,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.m,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.background,
    },
    prefix: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginRight: 8,
    },
    sequenceInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.colors.textPrimary,
        fontWeight: '600'
    },
    helperText: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 8,
        fontStyle: 'italic'
    }
});

