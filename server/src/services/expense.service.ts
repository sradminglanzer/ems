import { BaseService } from './base.service';
import { IExpense } from '../models/expense.model';
import { ObjectId } from 'mongodb';

class ExpenseService extends BaseService<IExpense> {
    constructor() {
        super('expenses');
    }

    async getExpensesWithRecordingUser(entityId: string, filter: any = {}) {
        return await this.getCollection().aggregate([
            { $match: { entityId: new ObjectId(entityId), ...filter } },
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
}

export default new ExpenseService();
