"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exam = void 0;
const mongodb_1 = require("mongodb");
class Exam {
    _id;
    entityId;
    feeGroupId;
    name;
    startDate;
    endDate;
    subjects;
    createdAt;
    updatedAt;
    constructor(data) {
        if (data._id)
            this._id = new mongodb_1.ObjectId(data._id);
        this.entityId = new mongodb_1.ObjectId(data.entityId);
        if (data.feeGroupId)
            this.feeGroupId = new mongodb_1.ObjectId(data.feeGroupId);
        this.name = data.name;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.subjects = Array.isArray(data.subjects) ? data.subjects : [];
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
    get valid() {
        return !!(this.entityId && this.name && this.startDate && this.endDate && this.subjects.length > 0);
    }
}
exports.Exam = Exam;
//# sourceMappingURL=exam.model.js.map