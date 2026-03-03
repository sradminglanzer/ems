import { FeePayment } from '../models/fee-payment.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class FeePaymentService extends BaseService<FeePayment> {
    constructor() {
        super('fee_payments');
    }

    async getByEntity(entityId: string) {
        return await this.get({ entityId: new ObjectId(entityId) });
    }

    async getByMember(memberId: string, entityId: string) {
        // Sort by paymentDate descending
        return await this.get({ memberId: new ObjectId(memberId), entityId: new ObjectId(entityId) }, { sort: { paymentDate: -1 } });
    }
}

export default new FeePaymentService();
