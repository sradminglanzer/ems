import { Exam } from '../models/exam.model';
import { BaseService } from './base.service';
declare class ExamService extends BaseService<Exam> {
    constructor();
    getByEntity(entityId: string): Promise<import("mongodb").WithId<Exam>[]>;
}
declare const _default: ExamService;
export default _default;
//# sourceMappingURL=exam.service.d.ts.map