import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, ScrollView, Platform, Alert, Image, Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { getUploadUrl } from '../../services/api';
import { theme, globalStyles } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const CATEGORIES = [
    'Rent / Lease', 'Electricity', 'Water', 'Internet & Phone',
    'Staff Salaries', 'Equipment Purchase', 'Equipment Maintenance',
    'Cleaning & Housekeeping', 'Marketing & Advertising',
    'Supplements & Products', 'Gym Supplies', 'Software & Subscriptions',
    'Insurance', 'Taxes & Govt Fees', 'Miscellaneous',
];

const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'card'];
const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank', card: 'Card'
};
const FREQUENCIES = ['weekly', 'monthly', 'annual'];

export default function AddExpenseScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useContext(AuthContext);

    const expenseToEdit = route.params?.expenseToEdit;
    const isEditing = !!expenseToEdit;

    // Form state
    const [title, setTitle] = useState(expenseToEdit?.title || '');
    const [category, setCategory] = useState(expenseToEdit?.category || '');
    const [amount, setAmount] = useState(expenseToEdit?.amount ? String(expenseToEdit.amount) : '');
    const [vendor, setVendor] = useState(expenseToEdit?.vendor || '');
    const [notes, setNotes] = useState(expenseToEdit?.notes || '');
    const [paymentMethod, setPaymentMethod] = useState<string>(expenseToEdit?.paymentMethod || 'cash');

    const [expenseDate, setExpenseDate] = useState<Date>(
        expenseToEdit?.expenseDate ? new Date(expenseToEdit.expenseDate) : new Date()
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [expenseDateStr, setExpenseDateStr] = useState(
        (expenseToEdit?.expenseDate ? new Date(expenseToEdit.expenseDate) : new Date())
            .toISOString().split('T')[0]
    );

    const [isRecurring, setIsRecurring] = useState(expenseToEdit?.isRecurring || false);
    const [recurringFrequency, setRecurringFrequency] = useState<string>(
        expenseToEdit?.recurringFrequency || 'monthly'
    );

    const [receiptUrl, setReceiptUrl] = useState(expenseToEdit?.receiptUrl || '');
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePickReceipt = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setIsUploadingReceipt(true);
            try {
                const mimeType = asset.mimeType || 'image/jpeg';
                const ext = mimeType.split('/')[1] || 'jpg';
                const filename = `receipt-${Date.now()}.${ext}`;

                const urlRes = await getUploadUrl(filename, mimeType);
                const { uploadUrl, publicUrl } = urlRes.data;

                const uploadResult = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
                    httpMethod: 'PUT',
                    headers: { 'Content-Type': mimeType },
                    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                });

                if (uploadResult.status < 200 || uploadResult.status >= 300) {
                    throw new Error(`Upload failed: ${uploadResult.status}`);
                }
                setReceiptUrl(publicUrl);
            } catch (err: any) {
                console.error('Failed to upload receipt:', err);
                Alert.alert('Upload Failed', err?.message || 'Unable to upload receipt.');
            } finally {
                setIsUploadingReceipt(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) return Alert.alert('Required', 'Please enter a title for the expense.');
        if (!category) return Alert.alert('Required', 'Please select a category.');
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return Alert.alert('Required', 'Please enter a valid amount.');
        }

        setIsSubmitting(true);
        try {
            const payload = {
                title: title.trim(),
                category,
                amount: Number(amount),
                expenseDate: expenseDateStr,
                paymentMethod,
                vendor: vendor.trim() || undefined,
                notes: notes.trim() || undefined,
                receiptUrl: receiptUrl || undefined,
                isRecurring,
                recurringFrequency: isRecurring ? recurringFrequency : undefined,
            };

            if (isEditing) {
                await api.put(`/expenses/${expenseToEdit._id}`, payload);
            } else {
                await api.post('/expenses', payload);
            }
            navigation.goBack();
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err?.response?.data?.message || 'Failed to save expense.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        const execute = async () => {
            try {
                await api.delete(`/expenses/${expenseToEdit._id}`);
                navigation.goBack();
            } catch (err: any) {
                Alert.alert('Error', 'Failed to delete expense.');
            }
        };
        if (Platform.OS === 'web') {
            if (window.confirm('Delete this expense?')) execute();
        } else {
            Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: execute },
            ]);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={theme.gradients.primary}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Expense' : 'Add Expense'}</Text>
                {isEditing ? (
                    <TouchableOpacity onPress={handleDelete} style={styles.backBtn}>
                        <Ionicons name="trash" size={20} color="#FCA5A5" />
                    </TouchableOpacity>
                ) : <View style={{ width: 40 }} />}
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Title */}
                <Text style={globalStyles.label}>Title *</Text>
                <TextInput
                    style={globalStyles.input}
                    placeholder="e.g. June Electricity Bill"
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor={theme.colors.textMuted}
                />

                {/* Category */}
                <Text style={globalStyles.label}>Category *</Text>
                <View style={styles.pillGrid}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.pill, category === cat && styles.pillActive]}
                            onPress={() => setCategory(cat)}
                        >
                            <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Amount */}
                <Text style={globalStyles.label}>Amount (₹) *</Text>
                <TextInput
                    style={globalStyles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    placeholderTextColor={theme.colors.textMuted}
                />

                {/* Date */}
                <Text style={globalStyles.label}>Date *</Text>
                {Platform.OS === 'web' ? (
                    <TextInput
                        style={globalStyles.input}
                        value={expenseDateStr}
                        onChangeText={(v) => {
                            setExpenseDateStr(v);
                            const d = new Date(v);
                            if (!isNaN(d.getTime())) setExpenseDate(d);
                        }}
                        {...{ type: 'date' } as any}
                        placeholderTextColor={theme.colors.textMuted}
                    />
                ) : (
                    <>
                        <TouchableOpacity
                            style={[globalStyles.input, { justifyContent: 'center' }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={{ color: theme.colors.textPrimary }}>{expenseDateStr}</Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={expenseDate}
                                mode="date"
                                display="default"
                                onChange={(_, d) => {
                                    setShowDatePicker(Platform.OS === 'ios');
                                    if (d) {
                                        setExpenseDate(d);
                                        setExpenseDateStr(d.toISOString().split('T')[0]);
                                    }
                                }}
                            />
                        )}
                    </>
                )}

                {/* Payment Method */}
                <Text style={globalStyles.label}>Payment Method</Text>
                <View style={styles.pillRow}>
                    {PAYMENT_METHODS.map(m => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.pill, paymentMethod === m && styles.pillActive]}
                            onPress={() => setPaymentMethod(m)}
                        >
                            <Text style={[styles.pillText, paymentMethod === m && styles.pillTextActive]}>
                                {PAYMENT_LABELS[m]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Vendor */}
                <Text style={globalStyles.label}>Paid To (Vendor)</Text>
                <TextInput
                    style={globalStyles.input}
                    placeholder="e.g. APSPDCL, John (Trainer)"
                    value={vendor}
                    onChangeText={setVendor}
                    placeholderTextColor={theme.colors.textMuted}
                />

                {/* Notes */}
                <Text style={globalStyles.label}>Notes</Text>
                <TextInput
                    style={[globalStyles.input, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="Optional description..."
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    placeholderTextColor={theme.colors.textMuted}
                />

                {/* Receipt Photo */}
                <Text style={globalStyles.label}>Receipt Photo</Text>
                <TouchableOpacity style={styles.receiptBox} onPress={handlePickReceipt} disabled={isUploadingReceipt}>
                    {isUploadingReceipt ? (
                        <ActivityIndicator color={theme.colors.primary} />
                    ) : receiptUrl ? (
                        <View style={{ alignItems: 'center' }}>
                            <Image source={{ uri: receiptUrl }} style={styles.receiptPreview} />
                            <Text style={{ color: theme.colors.success, marginTop: 6, fontSize: 12, fontWeight: '600' }}>
                                ✓ Receipt uploaded — tap to change
                            </Text>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="camera-outline" size={32} color={theme.colors.textMuted} />
                            <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>Tap to upload bill photo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Recurring Toggle */}
                <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[globalStyles.label, { marginBottom: 2 }]}>Recurring Expense?</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>
                            Auto-create next occurrence when due
                        </Text>
                    </View>
                    <Switch
                        value={isRecurring}
                        onValueChange={setIsRecurring}
                        trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                        thumbColor={isRecurring ? theme.colors.primary : '#f4f3f4'}
                    />
                </View>

                {isRecurring && (
                    <>
                        <Text style={globalStyles.label}>Frequency</Text>
                        <View style={styles.pillRow}>
                            {FREQUENCIES.map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.pill, recurringFrequency === f && styles.pillActive]}
                                    onPress={() => setRecurringFrequency(f)}
                                >
                                    <Text style={[styles.pillText, recurringFrequency === f && styles.pillTextActive]}>
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
                            <Text style={{ flex: 1, marginLeft: 8, fontSize: 12, color: theme.colors.textSecondary }}>
                                A reminder will appear on the dashboard each {recurringFrequency} when this expense is due for confirmation.
                            </Text>
                        </View>
                    </>
                )}

                {/* Submit */}
                <TouchableOpacity
                    style={[globalStyles.submitButton, { marginTop: 24 }, isSubmitting && globalStyles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={globalStyles.submitButtonText}>
                            {isEditing ? 'Save Changes' : 'Add Expense'}
                          </Text>
                    }
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        paddingTop: Platform.OS === 'ios' ? 54 : 40,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    body: { padding: 20 },
    pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    pill: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    pillActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    pillText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
    pillTextActive: { color: '#fff' },
    receiptBox: {
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        minHeight: 100,
        backgroundColor: theme.colors.surface,
    },
    receiptPreview: { width: 120, height: 80, borderRadius: 8, resizeMode: 'cover' },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.primaryLight + '15',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.primaryLight + '40',
    },
});
