import { FeePayment } from '../models/fee-payment.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class FeePaymentService extends BaseService<FeePayment> {
    constructor() {
        super('fee_payments');
    }

    async getByEntity(entityId: string | ObjectId, academicYearId?: string, customFilter: any = {}) {
        const conditions: any[] = [{ entityId: new ObjectId(entityId) }];
        if (customFilter && Object.keys(customFilter).length > 0) {
            conditions.push(customFilter);
        }
        if (academicYearId && academicYearId !== 'null' && academicYearId !== 'undefined' && academicYearId.toString() !== entityId.toString()) {
            conditions.push({
                $or: [
                    { academicYearId: new ObjectId(academicYearId) },
                    { academicYearId: null },
                    { academicYearId: { $exists: false } }
                ]
            });
        }
        const query = conditions.length > 1 ? { $and: conditions } : conditions[0];
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
     * computed reliably from entity fee payments.
     */
    async getCollectionStats(entityId: string | ObjectId, academicYearId?: string): Promise<{
        collectionToday: number;
        collectionThisMonth: number;
        collectionLastMonth: number;
    }> {
        const payments = await this.getByEntity(entityId, academicYearId);
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();

        let collectionToday = 0;
        let collectionThisMonth = 0;
        let collectionLastMonth = 0;

        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;

        for (const p of payments) {
            const amount = Number(p.amount) || 0;
            if (!amount) continue;

            const rawDate = p.paymentDate || (p as any).createdAt;
            if (!rawDate) {
                collectionThisMonth += amount;
                continue;
            }

            const d = new Date(rawDate);
            if (isNaN(d.getTime())) {
                collectionThisMonth += amount;
                continue;
            }

            const pYear = d.getFullYear();
            const pMonth = d.getMonth();
            const pDate = d.getDate();

            if (pYear === currentYear && pMonth === currentMonth && pDate === currentDate) {
                collectionToday += amount;
            }
            if (pYear === currentYear && pMonth === currentMonth) {
                collectionThisMonth += amount;
            }
            if (pYear === lastMonthYear && pMonth === lastMonth) {
                collectionLastMonth += amount;
            }
        }

        return {
            collectionToday,
            collectionThisMonth,
            collectionLastMonth,
        };
    }
}

export default new FeePaymentService();
