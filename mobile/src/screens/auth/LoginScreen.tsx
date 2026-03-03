import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }: any) {
    const { signIn } = useContext(AuthContext);
    const [contactNumber, setContactNumber] = useState('');
    const [mpin, setMpin] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!contactNumber) {
            Alert.alert('Error', 'Please enter your contact number');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/login', {
                contactNumber,
                mpin: mpin || undefined // If mpin is empty, send undefined so backend triggers setup logic
            });

            const data = response.data;

            if (data.requiresSetup) {
                navigation.navigate('SetupMpin', { contactNumber });
            } else if (data.token && data.user) {
                await signIn(data.token, data.user);
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Login failed. Please try again.';
            Alert.alert('Authentication Error', message);
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
                        <Ionicons name="school" size={48} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.title}>Welcome back</Text>
                    <Text style={styles.subtitle}>Sign in to access your dashboard</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Contact Number</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="call-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your phone number"
                                placeholderTextColor={theme.colors.textMuted}
                                keyboardType="phone-pad"
                                value={contactNumber}
                                onChangeText={setContactNumber}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>MPIN <Text style={styles.labelOptional}>(Leave empty for first setup)</Text></Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 4-6 digit pin"
                                placeholderTextColor={theme.colors.textMuted}
                                keyboardType="numeric"
                                secureTextEntry
                                value={mpin}
                                onChangeText={setMpin}
                                maxLength={6}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.colors.surface} />
                        ) : (
                            <Text style={styles.buttonText}>Continue</Text>
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
        fontWeight: '800',
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
    labelOptional: {
        fontWeight: '400',
        color: theme.colors.textMuted,
        fontSize: 12,
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
        color: theme.colors.surface,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
