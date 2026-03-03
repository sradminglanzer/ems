"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exam_result_model_1 = require("../models/exam-result.model");
const base_service_1 = require("./base.service");
const mongodb_1 = require("mongodb");
class ExamResultService extends base_service_1.BaseService {
    constructor() {
        super('exam_results');
    }
    async getByExam(examId) {
        return await this.get({ examId: new mongodb_1.ObjectId(examId) });
    }
    async saveBulk(examId, entityId, results) {
        const bulkOps = results.map(r => {
            const payload = new exam_result_model_1.ExamResult({ examId, entityId, memberId: r.memberId, marks: r.marks, remarks: r.remarks });
            const setValues = { marks: payload.marks, updatedAt: new Date() };
            if (payload.remarks) {
                setValues.remarks = payload.remarks;
            }
            return {
                updateOne: {
                    filter: { examId: new mongodb_1.ObjectId(examId), memberId: new mongodb_1.ObjectId(r.memberId) },
                    update: {
                        $set: setValues,
                        $setOnInsert: { entityId: new mongodb_1.ObjectId(entityId), examId: new mongodb_1.ObjectId(examId), createdAt: new Date() }
                    },
                    upsert: true
                }
            };
        });
        if (bulkOps.length > 0) {
            return await this.getCollection().bulkWrite(bulkOps);
        }
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }
}
exports.default = new ExamResultService();
//# sourceMappingURL=exam-result.service.js.map