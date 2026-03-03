"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeePayment = void 0;
const mongodb_1 = require("mongodb");
class FeePayment {
    _id;
    entityId;
    memberId;
    feeGroupId;
    amount;
    notes;
    paymentDate;
    createdAt;
    updatedAt;
    constructor(data) {
        if (data._id)
            this._id = new mongodb_1.ObjectId(data._id);
        this.entityId = new mongodb_1.ObjectId(data.entityId);
        this.memberId = new mongodb_1.ObjectId(data.memberId);
        if (data.feeGroupId)
            this.feeGroupId = new mongodb_1.ObjectId(data.feeGroupId);
        this.amount = Number(data.amount);
        this.notes = data.notes;
        this.paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
    get valid() {
        return !!(this.entityId && this.memberId && this.amount != null && !isNaN(this.amount));
    }
}
exports.FeePayment = FeePayment;
//# sourceMappingURL=fee-payment.model.js.map