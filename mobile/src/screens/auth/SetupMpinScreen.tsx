import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { theme, globalStyles } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

export default function SetupMpinScreen({ route, navigation }: any) {
    const { signIn } = useContext(AuthContext);
    const { contactNumber } = route.params; // Passed securely from LoginScreen

    const [mpin, setMpin] = useState('');
    const [confirmMpin, setConfirmMpin] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSetup = async () => {
        if (!mpin || mpin.length < 4) {
            Alert.alert('Error', 'MPIN must be at least 4 digits');
            return;
        }

        if (mpin !== confirmMpin) {
            Alert.alert('Error', 'MPINs do not match');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/login', {
                entityId: process.env.EXPO_PUBLIC_ENTITY_ID,
                contactNumber,
                mpin: mpin
            });

            const data = response.data;

            if (data.token && data.user) {
                // Successfully set MPIN and stored token
                await signIn(data.token, data.user);
            } else {
                Alert.alert('Setup Failed', 'Unexpected response from server.');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to setup MPIN.';
            Alert.alert('Setup Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <View style={styles.logoPlaceholder}>
                        <Ionicons name="shield-checkmark" size={48} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.title}>Secure your account</Text>
                    <Text style={styles.subtitle}>Set up a 4 to 6 digit MPIN</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>New MPIN</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="keypad-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 4-6 digits"
                                placeholderTextColor={theme.colors.textMuted}
                                keyboardType="numeric"
                                secureTextEntry
                                value={mpin}
                                onChangeText={setMpin}
                                maxLength={6}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm MPIN</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="checkmark-done-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Re-enter MPIN"
                                placeholderTextColor={theme.colors.textMuted}
                                keyboardType="numeric"
                                secureTextEntry
                                value={confirmMpin}
                                onChangeText={setConfirmMpin}
                                maxLength={6}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSetup}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.colors.surface} />
                        ) : (
                            <Text style={styles.buttonText}>Complete Setup</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
        color: theme.colors.textPrimary,
    },
    container: {
        flex: 1,
        padding: theme.spacing.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
    },
    logoPlaceholder: {
        width: 96,
        height: 96,
        backgroundColor: theme.colors.surface,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
        ...theme.shadows.md,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    form: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.xl,
        ...theme.shadows.sm,
    },
    inputContainer: {
        marginBottom: theme.spacing.l,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.m,
    },
    inputIcon: {
        marginRight: theme.spacing.s,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: theme.colors.textPrimary,
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        marginTop: theme.spacing.s,
        ...theme.shadows.sm,
    },
    buttonDisabled: {
        backgroundColor: theme.colors.primaryLight,
        shadowOpacity: 0,
    },
    buttonText: {
        fontSize: 14,
    }
});
