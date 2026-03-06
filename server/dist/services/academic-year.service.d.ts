import { ObjectId } from 'mongodb';
import { BaseService } from './base.service';
import { AcademicYear } from '../models/academic-year.model';
declare class AcademicYearService extends BaseService<AcademicYear> {
    constructor();
    getByEntity(entityId: string | ObjectId): Promise<import("mongodb").WithId<AcademicYear>[]>;
}
declare const _default: AcademicYearService;
export default _default;
//# sourceMappingURL=academic-year.service.d.ts.map