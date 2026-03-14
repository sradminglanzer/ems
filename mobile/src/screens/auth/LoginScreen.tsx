import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, TouchableHighlight, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, Animated, Vibration } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

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

    // Use a single Animated value for each dot to scale up
    const dotAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

    // Slide up animation for the keypad container
    const keypadAnim = useRef(new Animated.Value(100)).current;
    const keypadOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        checkSavedNumber();
    }, []);

    const checkSavedNumber = async () => {
        try {
            const savedNumber = await AsyncStorage.getItem(STORE_KEY);
            if (savedNumber && savedNumber.length > 5) {
                setContactNumber(savedNumber);
                setFlowState('ENTER_MPIN');
                triggerEntryAnimation();
            } else {
                setFlowState('ENTER_NUMBER');
            }
        } catch (e) {
            setFlowState('ENTER_NUMBER');
        }
    };

    const triggerEntryAnimation = () => {
        Animated.parallel([
            Animated.timing(keypadOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(keypadAnim, { toValue: 0, tension: 20, friction: 6, useNativeDriver: true })
        ]).start();
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
        if (!contactNumber || contactNumber.length < 10) {
            Alert.alert('Error', 'Please enter a valid 10-digit contact number');
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
                triggerEntryAnimation();
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

        // Tactile short vibration feedback
        if (Platform.OS === 'android') {
            Vibration.vibrate(30);
        } else {
            Vibration.vibrate();
        }

        if (val === 'backspace') {
            if (mpin.length > 0) {
                // Animate dot out
                Animated.timing(dotAnims[mpin.length - 1], { toValue: 0, duration: 150, useNativeDriver: true }).start();
                setMpin(prev => prev.slice(0, -1));
            }
        } else if (mpin.length < 4) {
            // Animate dot in
            Animated.spring(dotAnims[mpin.length], { toValue: 1, useNativeDriver: true, tension: 60, friction: 4 }).start();

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
                                    onChangeText={(text) => setContactNumber(text.replace(/[^0-9]/g, ''))}
                                    autoCapitalize="none"
                                    maxLength={10}
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
            <LinearGradient
                colors={[theme.colors.primaryLight + '10', theme.colors.background]}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.lockContainer}>
                <View style={styles.lockContent}>

                    <View style={styles.lockHeader}>
                        <View style={styles.avatarCircle}>
                            <Ionicons name="person" size={28} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.lockTitle}>Welcome Back</Text>
                        <Text style={styles.lockSubtitle}>{contactNumber}</Text>
                    </View>

                    <View style={styles.pinDisplayArea}>
                        <Text style={styles.pinPrompt}>Enter 4-Digit MPIN</Text>
                        <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
                            {[1, 2, 3, 4].map(idx => {
                                const isFilled = mpin.length >= idx;
                                const dotScale = dotAnims[idx - 1];
                                return (
                                    <View key={idx} style={[styles.dot, isFilled && styles.dotFilled]}>
                                        <Animated.View style={[styles.dotInner, { opacity: dotScale, transform: [{ scale: dotScale }] }]} />
                                    </View>
                                );
                            })}
                        </Animated.View>
                        <View style={{ height: 40, justifyContent: 'center' }}>
                            {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
                        </View>
                    </View>

                    {/* Custom Number Pad */}
                    <Animated.View style={[styles.keypad, { opacity: keypadOpacity, transform: [{ translateY: keypadAnim }] }]}>
                        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rowIdx) => (
                            <View key={rowIdx} style={styles.keypadRow}>
                                {row.map(num => (
                                    <TouchableHighlight
                                        key={num}
                                        style={styles.keyRoot}
                                        onPress={() => handleKeypadPress(num)}
                                        underlayColor={theme.colors.primaryLight + '30'}
                                    >
                                        <Text style={styles.keyText}>{num}</Text>
                                    </TouchableHighlight>
                                ))}
                            </View>
                        ))}
                        <View style={styles.keypadRow}>
                            {/* Switch Account Action */}
                            <TouchableOpacity style={styles.keyRootSecondary} onPress={handleSwitchAccount} activeOpacity={0.4}>
                                <Text style={styles.switchAccountText}>Change{'\n'}User</Text>
                            </TouchableOpacity>

                            <TouchableHighlight
                                style={styles.keyRoot}
                                onPress={() => handleKeypadPress('0')}
                                underlayColor={theme.colors.primaryLight + '30'}
                            >
                                <Text style={styles.keyText}>0</Text>
                            </TouchableHighlight>

                            {/* Backspace Action */}
                            <TouchableOpacity style={styles.keyRootSecondary} onPress={() => handleKeypadPress('backspace')} activeOpacity={0.4}>
                                <Ionicons name="backspace-outline" size={32} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

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
    lockContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    lockContent: { width: '100%', maxWidth: 400, alignItems: 'center', justifyContent: 'center' },

    lockHeader: { alignItems: 'center', marginBottom: 40 },
    avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...theme.shadows.sm, borderWidth: 1, borderColor: theme.colors.primaryLight + '50' },
    lockTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
    lockSubtitle: { fontSize: 16, color: theme.colors.textSecondary, fontWeight: '500', letterSpacing: 1 },

    pinDisplayArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
    pinPrompt: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16, fontWeight: '500' },
    dotsContainer: { flexDirection: 'row', alignItems: 'center', gap: 24 },
    dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
    dotFilled: { borderColor: theme.colors.primary },
    dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },

    keypad: { paddingHorizontal: theme.spacing.xxl, gap: 16, width: '100%' },
    keypadRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    keyRoot: { width: 70, height: 70, backgroundColor: theme.colors.surface, borderRadius: 35, justifyContent: 'center', alignItems: 'center', ...theme.shadows.sm, borderWidth: 1.5, borderColor: theme.colors.border },
    keyRootSecondary: { width: 70, height: 70, backgroundColor: 'transparent', borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
    keyText: { fontSize: 28, fontWeight: '500', color: theme.colors.textPrimary },
    switchAccountText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary, textAlign: 'center', letterSpacing: 0.5 },

});
