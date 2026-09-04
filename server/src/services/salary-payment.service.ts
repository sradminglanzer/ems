import { ObjectId } from 'mongodb';
import { BaseService } from './base.service';
import { SalaryPayment } from '../models/salary-payment.model';
import staffService from './staff.service';
import expenseService from './expense.service';
import { IExpense } from '../models/expense.model';

export class SalaryPaymentService extends BaseService<SalaryPayment> {
    constructor() {
        super('salary_payments');
    }

    async getMonthlyPayroll(entityIdStr: string, month: number, year: number) {
        const entityId = new ObjectId(entityIdStr);
        const [staffList, payments] = await Promise.all([
            staffService.getByEntity(entityIdStr),
            this.get({ entityId, month, year })
        ]);

        const paymentMap = new Map<string, any>();
        payments.forEach(p => paymentMap.set(p.staffId.toString(), p));

        return staffList.map(s => {
            const p = paymentMap.get(s._id!.toString());
            return {
                staffId: s._id!.toString(),
                employeeId: s.employeeId || null,
                staffName: s.name,
                staffRole: s.role,
                designation: s.designation || null,
                contactNumber: s.contactNumber,
                monthlySalary: s.monthlySalary || 0,
                hra: s.hra || 0,
                allowances: s.allowances || 0,
                pfDeduction: s.pfDeduction || 0,
                taxDeduction: s.taxDeduction || 0,
                status: p ? 'paid' : 'pending',
                paymentRecord: p ? {
                    ...p,
                    _id: p._id.toString(),
                    entityId: p.entityId.toString(),
                    staffId: p.staffId.toString(),
                    expenseId: p.expenseId ? p.expenseId.toString() : null
                } : null
            };
        });
    }

    async processSalary(entityIdStr: string, data: any) {
        const entityId = new ObjectId(entityIdStr);
        const staffId = new ObjectId(data.staffId);

        const staff = await staffService.getOne({ _id: staffId, entityId });
        if (!staff) {
            throw new Error('Staff member not found');
        }

        const baseSalary = Number(data.baseSalary ?? staff.monthlySalary ?? 0);
        const hra = Number(data.hra ?? staff.hra ?? 0);
        const allowances = Number(data.allowances ?? staff.allowances ?? 0);

        const pfDeduction = Number(data.pfDeduction ?? staff.pfDeduction ?? 0);
        const taxDeduction = Number(data.taxDeduction ?? staff.taxDeduction ?? 0);
        const unpaidLeaveDeduction = Number(data.unpaidLeaveDeduction ?? 0);
        const totalDeductions = Number(data.deductions != null ? data.deductions : (pfDeduction + taxDeduction + unpaidLeaveDeduction));

        const netSalary = Math.max(0, (baseSalary + hra + allowances) - totalDeductions);

        const paymentDate = data.paymentDate || new Date().toISOString().split('T')[0];
        const paymentMethod = data.paymentMethod || 'cash';
        const remarks = data.remarks || `Salary payment for ${staff.name}`;

        // 1. Automatically create Expense entry under category "Staff Salaries"
        const expenseDoc: IExpense = {
            entityId,
            title: `Salary: ${staff.name}`,
            category: 'Staff Salaries',
            amount: netSalary,
            expenseDate: new Date(paymentDate),
            paymentMethod: paymentMethod as any,
            vendor: staff.name,
            notes: remarks,
            status: 'confirmed',
            isRecurring: false,
            recordedBy: entityId,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const expenseResult = await expenseService.insert(expenseDoc);

        // 2. Insert into salary_payments collection
        const salaryPayment = new SalaryPayment({
            entityId,
            staffId,
            staffName: staff.name,
            staffRole: staff.role,
            employeeId: staff.employeeId,
            designation: staff.designation,
            month: Number(data.month),
            year: Number(data.year),
            baseSalary,
            hra,
            allowances,
            pfDeduction,
            taxDeduction,
            unpaidLeaveDeduction,
            deductions: totalDeductions,
            netSalary,
            paymentDate,
            paymentMethod,
            status: 'paid',
            remarks,
            expenseId: expenseResult.insertedId
        });

        const result = await this.insert(salaryPayment);
        return {
            ...salaryPayment,
            _id: result.insertedId.toString(),
            entityId: entityIdStr,
            staffId: data.staffId,
            expenseId: expenseResult.insertedId.toString()
        };
    }
}

export default new SalaryPaymentService();
