import { ExamResult } from '../models/exam-result.model';
import { BaseService } from './base.service';
declare class ExamResultService extends BaseService<ExamResult> {
    constructor();
    getByExam(examId: string): Promise<import("mongodb").WithId<ExamResult>[]>;
    getByMember(memberId: string): Promise<import("mongodb").WithId<ExamResult>[]>;
    saveBulk(examId: string, entityId: string, results: any[]): Promise<import("mongodb").BulkWriteResult | {
        matchedCount: number;
        modifiedCount: number;
        upsertedCount: number;
    }>;
}
declare const _default: ExamResultService;
export default _default;
//# sourceMappingURL=exam-result.service.d.ts.map