import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, Animated } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = '@ems_saved_contact';

export default function LoginScreen({ navigation }: any) {
    const { signIn } = useContext(AuthContext);

    // Flow State: 'CHECKING' -> 'ENTER_NUMBER' -> 'ENTER_MPIN'
    const [flowState, setFlowState] = useState<'CHECKING' | 'ENTER_NUMBER' | 'ENTER_MPIN'>('CHECKING');

    const [contactNumber, setContactNumber] = useState('');
    const [mpin, setMpin] = useState('');
    const [loading, setLoading] = useState(false);

    // Animations for MPIN dots
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        checkSavedNumber();
    }, []);

    const checkSavedNumber = async () => {
        try {
            const savedNumber = await AsyncStorage.getItem(STORE_KEY);
            if (savedNumber && savedNumber.length > 5) {
                setContactNumber(savedNumber);
                setFlowState('ENTER_MPIN');
            } else {
                setFlowState('ENTER_NUMBER');
            }
        } catch (e) {
            setFlowState('ENTER_NUMBER');
        }
    };

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
        ]).start();
    };

    const handleNumberPhase = async () => {
        if (!contactNumber || contactNumber.length < 5) {
            Alert.alert('Error', 'Please enter a valid contact number');
            return;
        }

        setLoading(true);
        try {
            // Test if number exists without MPIN to route either to SETUP or MPIN Lock
            const response = await api.post('/auth/login', {
                entityId: process.env.EXPO_PUBLIC_ENTITY_ID,
                contactNumber,
            });

            const data = response.data;

            if (data.requiresSetup) {
                // Number exists but no MPIN set -> proceed to setup, don't save yet until fully verified
                navigation.navigate('SetupMpin', { contactNumber });
            } else if (data.requiresMpin || data.token) {
                // User has MPIN, save local identity and show Lock Screen
                await AsyncStorage.setItem(STORE_KEY, contactNumber);
                setMpin('');
                setFlowState('ENTER_MPIN');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Login failed. Please check contact number.';
            Alert.alert('Authentication Error', message);
        } finally {
            setLoading(false);
        }
    };

    const handleLoginMpin = async (fullMpin: string) => {
        setLoading(true);
        try {
            const response = await api.post('/auth/login', {
                entityId: process.env.EXPO_PUBLIC_ENTITY_ID,
                contactNumber,
                mpin: fullMpin
            });

            const data = response.data;

            if (data.token && data.user) {
                // Ensure number is definitely saved locally on success
                await AsyncStorage.setItem(STORE_KEY, contactNumber);
                await signIn(data.token, data.user);
            }
        } catch (error: any) {
            triggerShake();
            setMpin(''); // Clear failed pin
            const message = error.response?.data?.message || 'Invalid MPIN. Please try again.';
            Alert.alert('Authentication Error', message);
        } finally {
            setLoading(false);
        }
    };

    // MPIN Input Logic
    const handleKeypadPress = (val: string) => {
        if (loading) return;

        if (val === 'backspace') {
            setMpin(prev => prev.slice(0, -1));
        } else if (mpin.length < 4) {
            const newMpin = mpin + val;
            setMpin(newMpin);
            if (newMpin.length === 4) {
                // Auto-submit once 4 digits entered
                handleLoginMpin(newMpin);
            }
        }
    };

    const handleSwitchAccount = async () => {
        await AsyncStorage.removeItem(STORE_KEY);
        setContactNumber('');
        setMpin('');
        setFlowState('ENTER_NUMBER');
    };

    if (flowState === 'CHECKING') {
        return (
            <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </SafeAreaView>
        );
    }

    // -- RENDER: ENTER NUMBER FLOW --
    if (flowState === 'ENTER_NUMBER') {
        return (
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.header}>
                        <View style={styles.logoPlaceholder}>
                            <Ionicons name="school" size={48} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.title}>Welcome</Text>
                        <Text style={styles.subtitle}>Enter your contact number to begin</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Contact Number</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="call-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputNative}
                                    placeholder="e.g. 9876543210"
                                    placeholderTextColor={theme.colors.textMuted}
                                    keyboardType="phone-pad"
                                    value={contactNumber}
                                    onChangeText={setContactNumber}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleNumberPhase}
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

    // -- RENDER: MPIN LOCK SCREEN FLOW --
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.lockContainer}>

                <View style={styles.lockHeader}>
                    <View style={styles.avatarCircle}>
                        <Ionicons name="person" size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.lockTitle}>Welcome Back</Text>
                    <Text style={styles.lockSubtitle}>{contactNumber}</Text>
                </View>

                <View style={styles.pinDisplayArea}>
                    <Text style={styles.pinPrompt}>Enter 4-Digit MPIN</Text>
                    <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
                        {[1, 2, 3, 4].map(idx => {
                            const isFilled = mpin.length >= idx;
                            return (
                                <View key={idx} style={[styles.dot, isFilled && styles.dotFilled]} />
                            );
                        })}
                    </Animated.View>
                    <View style={{ height: 40, justifyContent: 'center' }}>
                        {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
                    </View>
                </View>

                {/* Custom Number Pad */}
                <View style={styles.keypad}>
                    {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rowIdx) => (
                        <View key={rowIdx} style={styles.keypadRow}>
                            {row.map(num => (
                                <TouchableOpacity key={num} style={styles.keyRoot} onPress={() => handleKeypadPress(num)}>
                                    <Text style={styles.keyText}>{num}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                    <View style={styles.keypadRow}>
                        {/* Switch Account Action */}
                        <TouchableOpacity style={styles.keyRootSecondary} onPress={handleSwitchAccount}>
                            <Text style={styles.switchAccountText}>Change{'\n'}User</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.keyRoot} onPress={() => handleKeypadPress('0')}>
                            <Text style={styles.keyText}>0</Text>
                        </TouchableOpacity>

                        {/* Backspace Action */}
                        <TouchableOpacity style={styles.keyRootSecondary} onPress={() => handleKeypadPress('backspace')}>
                            <Ionicons name="backspace" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    container: { flex: 1, padding: theme.spacing.xl, justifyContent: 'center' },

    // -- Number Entry Flow Styles --
    header: { alignItems: 'center', marginBottom: theme.spacing.xxl },
    logoPlaceholder: { width: 96, height: 96, backgroundColor: theme.colors.surface, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.l, ...theme.shadows.md },
    title: { fontSize: 32, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: theme.spacing.xs, letterSpacing: -0.5 },
    subtitle: { fontSize: 16, color: theme.colors.textSecondary },
    form: { backgroundColor: theme.colors.surface, padding: theme.spacing.l, borderRadius: theme.borderRadius.xl, ...theme.shadows.sm },
    inputContainer: { marginBottom: theme.spacing.l },
    label: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: theme.spacing.s },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.m, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.m },
    inputIcon: { marginRight: theme.spacing.s },
    inputNative: { flex: 1, paddingVertical: 16, fontSize: 16, color: theme.colors.textPrimary },
    button: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: theme.borderRadius.m, alignItems: 'center', marginTop: theme.spacing.s, ...theme.shadows.sm },
    buttonDisabled: { backgroundColor: theme.colors.primaryLight, shadowOpacity: 0 },
    buttonText: { color: theme.colors.surface, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

    // -- Lock Screen Flow Styles --
    lockContainer: { flex: 1, justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 50 : 30 },
    lockHeader: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 80 : 60 },
    avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
    lockTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 4 },
    lockSubtitle: { fontSize: 16, color: theme.colors.textSecondary, fontWeight: '500' },

    pinDisplayArea: { alignItems: 'center', justifyContent: 'center', paddingTop: 20, paddingBottom: 10 },
    pinPrompt: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 20 },
    dotsContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.border },
    dotFilled: { backgroundColor: theme.colors.primary, transform: [{ scale: 1.2 }] },

    keypad: { paddingHorizontal: theme.spacing.xl, gap: 16 },
    keypadRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    keyRoot: { flex: 1, aspectRatio: 1.5, borderRadius: theme.borderRadius.round, justifyContent: 'center', alignItems: 'center' },
    keyRootSecondary: { flex: 1, aspectRatio: 1.5, backgroundColor: 'transparent', borderRadius: theme.borderRadius.round, justifyContent: 'center', alignItems: 'center' },
    keyText: { fontSize: 32, fontWeight: '400', color: theme.colors.textPrimary },
    switchAccountText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary, textAlign: 'center' },

});
