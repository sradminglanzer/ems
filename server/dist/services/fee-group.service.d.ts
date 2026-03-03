import { FeeGroup } from '../models/fee-group.model';
import { BaseService } from './base.service';
declare class FeeGroupService extends BaseService<FeeGroup> {
    constructor();
    getByEntity(entityId: string): Promise<import("mongodb").WithId<FeeGroup>[]>;
}
declare const _default: FeeGroupService;
export default _default;
//# sourceMappingURL=fee-group.service.d.ts.map