import { Member } from '../models/member.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class MemberService extends BaseService<Member> {
    constructor() {
        super('members');
    }

    async getByEntity(entityId: string): Promise<Member[]> {
        const collection = await this.getCollection();
        return collection.find({ entityId: new ObjectId(entityId) }).toArray();
    }

    /**
     * Returns only members who are overdue (latestNextPaymentDate < today),
     * excluding members on hold / checked out / inactive.
     */
    async getOverdueMembers(entityId: string, today: Date): Promise<any[]> {
        const collection = this.getCollection();
        const members = await collection.aggregate([
            { $match: { entityId: new ObjectId(entityId), status: { $nin: ['on_hold', 'checked_out', 'inactive'] } } },
            {
                $lookup: {
                    from: 'fee_payments',
                    let: { memberId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$memberId', '$$memberId'] }, nextPaymentDate: { $ne: null } } },
                        { $sort: { paymentDate: -1, createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'latestPayment'
                }
            },
            {
                $addFields: {
                    latestPaymentDoc: { $arrayElemAt: ['$latestPayment', 0] }
                }
            },
            {
                $match: {
                    latestPaymentDoc: { $exists: true, $ne: null }
                }
            },
            {
                $project: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    knownId: 1,
                    contact: 1,
                    nextPaymentDate: '$latestPaymentDoc.nextPaymentDate'
                }
            }
        ]).toArray();

        return members.filter(m => {
            if (!m.nextPaymentDate) return false;
            const d = new Date(m.nextPaymentDate);
            return !isNaN(d.getTime()) && d < today;
        });
    }

    /**
     * Returns members who are overdue or have a renewal due within the next 7 days,
     * based on their most recent payment renewal date.
     */
    async getExpiringMembers(entityId: string): Promise<any[]> {
        const collection = this.getCollection();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);

        const members = await collection.aggregate([
            { $match: { entityId: new ObjectId(entityId), status: { $nin: ['on_hold', 'checked_out', 'inactive'] } } },
            {
                $lookup: {
                    from: 'fee_payments',
                    let: { memberId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$memberId', '$$memberId'] }, nextPaymentDate: { $ne: null } } },
                        { $sort: { paymentDate: -1, createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'latestPayment'
                }
            },
            {
                $addFields: {
                    latestPaymentDoc: { $arrayElemAt: ['$latestPayment', 0] }
                }
            },
            {
                $match: {
                    latestPaymentDoc: { $exists: true, $ne: null }
                }
            },
            {
                $project: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    knownId: 1,
                    contact: 1,
                    nextPaymentDate: '$latestPaymentDoc.nextPaymentDate'
                }
            }
        ]).toArray();

        const result = [];
        for (const m of members) {
            if (!m.nextPaymentDate) continue;
            const d = new Date(m.nextPaymentDate);
            if (isNaN(d.getTime())) continue;

            if (d <= nextWeek) {
                result.push({
                    _id: m._id,
                    firstName: m.firstName,
                    lastName: m.lastName,
                    knownId: m.knownId,
                    contact: m.contact,
                    nextPaymentDate: d,
                    isOverdue: d < today
                });
            }
        }

        return result.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
    }
}

export default new MemberService();
