import { FeePayment } from '../models/fee-payment.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class FeePaymentService extends BaseService<FeePayment> {
    constructor() {
        super('fee_payments');
    }

    async getByEntity(entityId: string | ObjectId, academicYearId?: string) {
        const query: any = { entityId: new ObjectId(entityId) };
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
}

export default new FeePaymentService();
