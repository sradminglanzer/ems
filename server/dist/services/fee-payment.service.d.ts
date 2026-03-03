import { FeePayment } from '../models/fee-payment.model';
import { BaseService } from './base.service';
declare class FeePaymentService extends BaseService<FeePayment> {
    constructor();
    getByEntity(entityId: string): Promise<import("mongodb").WithId<FeePayment>[]>;
    getByMember(memberId: string, entityId: string): Promise<import("mongodb").WithId<FeePayment>[]>;
}
declare const _default: FeePaymentService;
export default _default;
//# sourceMappingURL=fee-payment.service.d.ts.map