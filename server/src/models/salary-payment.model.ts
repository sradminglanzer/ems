import { ObjectId } from 'mongodb';

export class SalaryPayment {
    _id?: ObjectId;
    entityId: ObjectId;
    staffId: ObjectId;
    staffName: string;
    staffRole: string;
    employeeId?: string;
    designation?: string;
    month: number; // 1-12
    year: number;  // e.g. 2026

    // Earnings
    baseSalary: number;
    hra: number;
    allowances: number;

    // Deductions
    pfDeduction: number;
    taxDeduction: number;
    unpaidLeaveDeduction: number;
    deductions: number;

    // Net
    netSalary: number;
    paymentDate: string; // YYYY-MM-DD
    paymentMethod: 'cash' | 'upi' | 'cheque' | 'bank_transfer';
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
        this.employeeId = data.employeeId || undefined;
        this.designation = data.designation || undefined;
        this.month = Number(data.month);
        this.year = Number(data.year);

        this.baseSalary = Number(data.baseSalary || 0);
        this.hra = Number(data.hra || 0);
        this.allowances = Number(data.allowances || 0);

        this.pfDeduction = Number(data.pfDeduction || 0);
        this.taxDeduction = Number(data.taxDeduction || 0);
        this.unpaidLeaveDeduction = Number(data.unpaidLeaveDeduction || 0);
        this.deductions = Number(data.deductions != null ? data.deductions : (this.pfDeduction + this.taxDeduction + this.unpaidLeaveDeduction));

        const totalEarnings = this.baseSalary + this.hra + this.allowances;
        this.netSalary = Math.max(0, totalEarnings - this.deductions);

        this.paymentDate = data.paymentDate || new Date().toISOString().split('T')[0];
        this.paymentMethod = data.paymentMethod || 'cash';
        this.status = data.status || 'paid';
        this.remarks = data.remarks || undefined;
        if (data.expenseId) this.expenseId = new ObjectId(data.expenseId);
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
}
