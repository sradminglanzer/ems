import { Member } from '../models/member.model';
import { BaseService } from './base.service';
declare class MemberService extends BaseService<Member> {
    constructor();
    getByEntity(entityId: string): Promise<Member[]>;
}
declare const _default: MemberService;
export default _default;
//# sourceMappingURL=member.service.d.ts.map