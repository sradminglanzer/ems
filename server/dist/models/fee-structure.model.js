"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeStructure = void 0;
const mongodb_1 = require("mongodb");
class FeeStructure {
    _id;
    entityId;
    feeGroupId; // Links to a specific class / fee group
    amount;
    frequency;
    name; // e.g., "Tuition Fee", "Lab Fee"
    createdAt;
    updatedAt;
    constructor(data) {
        if (data._id)
            this._id = new mongodb_1.ObjectId(data._id);
        this.entityId = new mongodb_1.ObjectId(data.entityId);
        this.feeGroupId = new mongodb_1.ObjectId(data.feeGroupId);
        this.amount = Number(data.amount);
        this.frequency = data.frequency;
        this.name = data.name;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
    get valid() {
        return !!(this.entityId && this.feeGroupId && this.amount > 0 && this.frequency && this.name);
    }
}
exports.FeeStructure = FeeStructure;
//# sourceMappingURL=fee-structure.model.js.map