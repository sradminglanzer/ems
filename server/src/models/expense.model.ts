import { ObjectId } from 'mongodb';

export interface IExpense {
    _id?: ObjectId;
    entityId: ObjectId;
    amount: number;
    category: string;
    description?: string;
    paymentMethod: string;
    expenseDate: Date;
    receiptUrl?: string;
    recordedBy: ObjectId;
    academicYearId?: ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}
