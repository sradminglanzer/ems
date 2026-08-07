import { FeePayment } from '../models/fee-payment.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class FeePaymentService extends BaseService<FeePayment> {
    constructor() {
        super('fee_payments');
    }

    async getByEntity(entityId: string | ObjectId, academicYearId?: string, customFilter: any = {}) {
        const query: any = { entityId: new ObjectId(entityId), ...customFilter };
        if (academicYearId) {
            query.academicYearId = new ObjectId(academicYearId);
        }
        return this.get(query);
    }

    async getByMember(memberId: string | ObjectId, entityId: string | ObjectId, academicYearId?: string) {
        const query: any = { memberId: new ObjectId(memberId), entityId: new ObjectId(entityId) };
        if (academicYearId) {
            query.academicYearId = new ObjectId(academicYearId);
        }
        return this.get(query, { sort: { paymentDate: -1 } });
    }

    async getNextSequence(entityId: string | ObjectId): Promise<string> {
        const { getDB } = require('../config/db');
        const db = getDB();
        const counters = db.collection('counters');
        
        const result = await counters.findOneAndUpdate(
            { _id: `receiptNo_${entityId.toString()}` },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true }
        );
        
        const seqNum = result?.seq || 1;
        const paddedSeq = String(seqNum).padStart(4, '0');
        return `REC-${paddedSeq}`;
    }

    async setNextSequence(entityId: string | ObjectId, newSeq: number): Promise<boolean> {
        const { getDB } = require('../config/db');
        const db = getDB();
        const counters = db.collection('counters');
        
        await counters.updateOne(
            { _id: `receiptNo_${entityId.toString()}` },
            { $set: { seq: newSeq - 1 } },
            { upsert: true }
        );
        return true;
    }

    /**
     * Returns collectionToday, collectionThisMonth, collectionLastMonth
     * using a single $facet aggregation — no payment documents fetched into memory.
     */
    async getCollectionStats(entityId: string, academicYearId?: string): Promise<{
        collectionToday: number;
        collectionThisMonth: number;
        collectionLastMonth: number;
    }> {
        const collection = this.getCollection();
        const today = new Date();

        const todayStart     = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd       = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        const match: any = { entityId: new ObjectId(entityId) };
        if (academicYearId) match.academicYearId = new ObjectId(academicYearId);

        const [result] = await collection.aggregate([
            { $match: match },
            {
                $facet: {
                    today: [
                        { $match: { paymentDate: { $gte: todayStart, $lt: todayEnd } } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ],
                    thisMonth: [
                        { $match: { paymentDate: { $gte: thisMonthStart } } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ],
                    lastMonth: [
                        { $match: { paymentDate: { $gte: lastMonthStart, $lt: thisMonthStart } } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ]
                }
            }
        ]).toArray() as any[];

        return {
            collectionToday:     result?.today?.[0]?.total     ?? 0,
            collectionThisMonth: result?.thisMonth?.[0]?.total ?? 0,
            collectionLastMonth: result?.lastMonth?.[0]?.total ?? 0,
        };
    }
}

export default new FeePaymentService();
