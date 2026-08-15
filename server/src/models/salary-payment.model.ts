import { ObjectId } from 'mongodb';

export class SalaryPayment {
    _id?: ObjectId;
    entityId: ObjectId;
    staffId: ObjectId;
    staffName: string;
    staffRole: string;
    month: number; // 1-12
    year: number;  // e.g. 2026
    baseSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    paymentDate: string; // YYYY-MM-DD
    paymentMethod: 'bank_transfer' | 'upi' | 'cash' | 'cheque';
    status: 'paid' | 'pending';
    remarks?: string;
    expenseId?: ObjectId;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: any) {
        if (data._id) this._id = new ObjectId(data._id);
        this.entityId = new ObjectId(data.entityId);
        this.staffId = new ObjectId(data.staffId);
        this.staffName = data.staffName;
        this.staffRole = data.staffRole || 'staff';
        this.month = Number(data.month);
        this.year = Number(data.year);
        this.baseSalary = Number(data.baseSalary || 0);
        this.allowances = Number(data.allowances || 0);
        this.deductions = Number(data.deductions || 0);
        this.netSalary = this.baseSalary + this.allowances - this.deductions;
        this.paymentDate = data.paymentDate || new Date().toISOString().split('T')[0];
        this.paymentMethod = data.paymentMethod || 'bank_transfer';
        this.status = data.status || 'paid';
        this.remarks = data.remarks || undefined;
        if (data.expenseId) this.expenseId = new ObjectId(data.expenseId);
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
}
