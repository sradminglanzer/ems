"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_service_1 = require("./base.service");
const mongodb_1 = require("mongodb");
class FeePaymentService extends base_service_1.BaseService {
    constructor() {
        super('fee_payments');
    }
    async getByEntity(entityId, academicYearId) {
        const query = { entityId: new mongodb_1.ObjectId(entityId) };
        if (academicYearId) {
            query.academicYearId = new mongodb_1.ObjectId(academicYearId);
        }
        return this.get(query);
    }
    async getByMember(memberId, entityId, academicYearId) {
        const query = { memberId: new mongodb_1.ObjectId(memberId), entityId: new mongodb_1.ObjectId(entityId) };
        if (academicYearId) {
            query.academicYearId = new mongodb_1.ObjectId(academicYearId);
        }
        return this.get(query, { sort: { paymentDate: -1 } });
    }
}
exports.default = new FeePaymentService();
//# sourceMappingURL=fee-payment.service.js.map