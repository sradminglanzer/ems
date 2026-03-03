"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_service_1 = require("./base.service");
const mongodb_1 = require("mongodb");
class FeePaymentService extends base_service_1.BaseService {
    constructor() {
        super('fee_payments');
    }
    async getByEntity(entityId) {
        return await this.get({ entityId: new mongodb_1.ObjectId(entityId) });
    }
    async getByMember(memberId, entityId) {
        // Sort by paymentDate descending
        return await this.get({ memberId: new mongodb_1.ObjectId(memberId), entityId: new mongodb_1.ObjectId(entityId) }, { sort: { paymentDate: -1 } });
    }
}
exports.default = new FeePaymentService();
//# sourceMappingURL=fee-payment.service.js.map