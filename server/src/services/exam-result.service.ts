import { ExamResult } from '../models/exam-result.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class ExamResultService extends BaseService<ExamResult> {
    constructor() {
        super('exam_results');
    }

    async getByExam(examId: string) {
        return await this.get({ examId: new ObjectId(examId) });
    }

    async getByMember(memberId: string) {
        return await this.get({ memberId: new ObjectId(memberId) });
    }

    async saveBulk(examId: string, entityId: string, results: any[]) {
        const bulkOps = results.map(r => {
            const payload = new ExamResult({ examId, entityId, memberId: r.memberId, marks: r.marks, remarks: r.remarks });
            const setValues: any = { marks: payload.marks, updatedAt: new Date() };
            if (payload.remarks) {
                setValues.remarks = payload.remarks;
            }
            return {
                updateOne: {
                    filter: { examId: new ObjectId(examId), memberId: new ObjectId(r.memberId) },
                    update: {
                        $set: setValues,
                        $setOnInsert: { entityId: new ObjectId(entityId), examId: new ObjectId(examId), createdAt: new Date() }
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

export default new ExamResultService();
