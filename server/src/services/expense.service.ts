import { BaseService } from './base.service';
import { IExpense, RecurringFrequency } from '../models/expense.model';
import { ObjectId } from 'mongodb';

export function computeNextRecurringDate(from: Date, frequency: RecurringFrequency): Date {
    const d = new Date(from);
    if (frequency === 'weekly') d.setDate(d.getDate() + 7);
    else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (frequency === 'annual') d.setFullYear(d.getFullYear() + 1);
    return d;
}

class ExpenseService extends BaseService<IExpense> {
    constructor() {
        super('expenses');
    }

    async getFilteredExpenses(entityId: string, opts: {
        startDate?: Date;
        endDate?: Date;
        category?: string;
        paymentMethod?: string;
    } = {}) {
        const match: any = { entityId: new ObjectId(entityId) };

        if (opts.startDate || opts.endDate) {
            match.expenseDate = {};
            if (opts.startDate) match.expenseDate.$gte = opts.startDate;
            if (opts.endDate) match.expenseDate.$lte = opts.endDate;
        }
        if (opts.category) match.category = opts.category;
        if (opts.paymentMethod) match.paymentMethod = opts.paymentMethod;

        return await this.getCollection().aggregate([
            { $match: match },
            { $sort: { expenseDate: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'recordedBy',
                    foreignField: '_id',
                    as: 'recordedByUser'
                }
            },
            {
                $unwind: {
                    path: '$recordedByUser',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    'recordedByUser.password': 0,
                    'recordedByUser.mPin': 0
                }
            }
        ]).toArray();
    }

    /** Summary: total per category for a given month */
    async getMonthlySummary(entityId: string, year: number, month: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        return await this.getCollection().aggregate([
            {
                $match: {
                    entityId: new ObjectId(entityId),
                    expenseDate: { $gte: startDate, $lte: endDate },
                    status: 'confirmed'
                }
            },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { total: -1 } }
        ]).toArray();
    }
}

export default new ExpenseService();
