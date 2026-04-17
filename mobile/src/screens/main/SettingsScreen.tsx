import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { AuthContext } from '../../context/AuthContext';

export default function SettingsScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { user } = useContext(AuthContext);

    const [sequence, setSequence] = useState('');
    const [submitting, setSubmitting] = useState(false);

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
