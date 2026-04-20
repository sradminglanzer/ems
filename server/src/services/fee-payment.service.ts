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
}

export default new FeePaymentService();
