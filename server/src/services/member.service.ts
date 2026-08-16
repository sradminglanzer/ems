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
     * excluding members on hold. Uses an aggregation pipeline with $lookup
     * so only the relevant subset is fetched from the DB.
     */
    async getOverdueMembers(entityId: string, today: Date): Promise<any[]> {
        const collection = this.getCollection();
        return collection.aggregate([
            { $match: { entityId: new ObjectId(entityId), status: { $ne: 'on_hold' } } },
            {
                $lookup: {
                    from: 'fee_payments',
                    localField: '_id',
                    foreignField: 'memberId',
                    as: 'payments'
                }
            },
            {
                $addFields: {
                    latestNextDate: { $max: '$payments.nextPaymentDate' }
                }
            },
            {
                $match: {
                    latestNextDate: { $lt: today }
                }
            },
            {
                // Drop the payments array — we only needed it to compute latestNextDate
                $project: { payments: 0 }
            }
        ]).toArray();
    }
    /**
     * Returns members who are overdue or have a renewal due within the next 7 days.
     * Members with no payments (null latestNextDate) are excluded.
     */
    async getExpiringMembers(entityId: string): Promise<any[]> {
        const collection = this.getCollection();
        const today = new Date();
        const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);

        const members = await collection.aggregate([
            { $match: { entityId: new ObjectId(entityId), status: { $ne: 'on_hold' } } },
            {
                $lookup: {
                    from: 'fee_payments',
                    localField: '_id',
                    foreignField: 'memberId',
                    as: 'payments'
                }
            },
            {
                $addFields: {
                    latestNextDate: { $max: '$payments.nextPaymentDate' }
                }
            },
            {
                // Exclude members with no payments (latestNextDate would be null)
                // Include only overdue or expiring within 7 days
                $match: {
                    latestNextDate: { $ne: null, $lt: nextWeek }
                }
            },
            {
                $project: {
                    payments: 0
                }
            },
            { $sort: { latestNextDate: 1 } }
        ]).toArray();

        // Add isOverdue flag in Node.js
        return members.map(m => ({
            _id: m._id,
            firstName: m.firstName,
            lastName: m.lastName,
            knownId: m.knownId,
            contact: m.contact,
            nextPaymentDate: m.latestNextDate,
            isOverdue: new Date(m.latestNextDate) < today
        }));
    }
}

export default new MemberService();
