import { ExamResult } from '../models/exam-result.model';
import { BaseService } from './base.service';
import { ObjectId } from 'mongodb';

class ExamResultService extends BaseService<ExamResult> {
    constructor() {
        super('exam_results');
    }

    async getByExam(examId: string) {
        let examObjId: ObjectId | null = null;
        try {
            examObjId = new ObjectId(examId);
        } catch {
            examObjId = null;
        }
        const query: any = examObjId
            ? { $or: [{ examId: examObjId }, { examId }] }
            : { examId };
        return await this.get(query);
    }

    async getByMember(memberId: string) {
        let memberObjId: ObjectId | null = null;
        try {
            memberObjId = new ObjectId(memberId);
        } catch {
            memberObjId = null;
        }
        const query: any = memberObjId
            ? { $or: [{ memberId: memberObjId }, { memberId }] }
            : { memberId };
        return await this.get(query);
    }

    async saveBulk(examId: string, entityId: string, results: any[]) {
        const bulkOps = results.map(r => {
            const payload = new ExamResult({
                examId,
                entityId,
                memberId: r.memberId,
                marks: r.marks || r.subjectScores,
                remarks: r.remarks
            });
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
