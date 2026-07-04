import { ObjectId } from 'mongodb';

export type ExpenseCategory =
    | 'Rent / Lease'
    | 'Electricity'
    | 'Water'
    | 'Internet & Phone'
    | 'Staff Salaries'
    | 'Equipment Purchase'
    | 'Equipment Maintenance'
    | 'Cleaning & Housekeeping'
    | 'Marketing & Advertising'
    | 'Supplements & Products'
    | 'Gym Supplies'
    | 'Software & Subscriptions'
    | 'Insurance'
    | 'Taxes & Govt Fees'
    | 'Miscellaneous';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
    'Rent / Lease',
    'Electricity',
    'Water',
    'Internet & Phone',
    'Staff Salaries',
    'Equipment Purchase',
    'Equipment Maintenance',
    'Cleaning & Housekeeping',
    'Marketing & Advertising',
    'Supplements & Products',
    'Gym Supplies',
    'Software & Subscriptions',
    'Insurance',
    'Taxes & Govt Fees',
    'Miscellaneous',
];

export type RecurringFrequency = 'weekly' | 'monthly' | 'annual';
export type ExpenseStatus = 'confirmed' | 'pending_confirmation';
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'card';

export interface IExpense {
    _id?: ObjectId;
    entityId: ObjectId;
    title: string;
    category: string;
    amount: number;
    expenseDate: Date;
    paymentMethod: PaymentMethod;
    vendor?: string;
    notes?: string;
    receiptUrl?: string;
    status: ExpenseStatus;
    isRecurring: boolean;
    recurringFrequency?: RecurringFrequency;
    recurringNextDate?: Date;
    recurringParentId?: ObjectId;
    recordedBy: ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}
