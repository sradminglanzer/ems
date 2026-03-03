"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamResult = void 0;
const mongodb_1 = require("mongodb");
class ExamResult {
    _id;
    entityId;
    examId;
    memberId;
    marks;
    remarks;
    createdAt;
    updatedAt;
    constructor(data) {
        if (data._id)
            this._id = new mongodb_1.ObjectId(data._id);
        this.entityId = new mongodb_1.ObjectId(data.entityId);
        this.examId = new mongodb_1.ObjectId(data.examId);
        this.memberId = new mongodb_1.ObjectId(data.memberId);
        this.marks = Array.isArray(data.marks) ? data.marks.map((m) => ({
            subjectName: m.subjectName,
            score: Number(m.score),
            maxScore: Number(m.maxScore)
        })) : [];
        this.remarks = data.remarks;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
    get valid() {
        return !!(this.entityId && this.examId && this.memberId && this.marks);
    }
}
exports.ExamResult = ExamResult;
//# sourceMappingURL=exam-result.model.js.map