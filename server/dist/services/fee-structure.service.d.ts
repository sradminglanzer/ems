import { FeeStructure } from '../models/fee-structure.model';
import { BaseService } from './base.service';
declare class FeeStructureService extends BaseService<FeeStructure> {
    constructor();
    getByFeeGroup(feeGroupId: string): Promise<import("mongodb").WithId<FeeStructure>[]>;
    getByEntity(entityId: string): Promise<import("bson").Document[]>;
}
declare const _default: FeeStructureService;
export default _default;
//# sourceMappingURL=fee-structure.service.d.ts.map