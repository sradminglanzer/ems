import { User } from '../models/user.model';
import { BaseService } from './base.service';
import { OptionalUnlessRequiredId } from 'mongodb';
declare class UserService extends BaseService<User> {
    constructor();
    getUsersByEntity(entityId: string): Promise<import("mongodb").WithId<User>[]>;
    insert(user: OptionalUnlessRequiredId<User>): Promise<import("mongodb").InsertOneResult<User>>;
}
declare const _default: UserService;
export default _default;
//# sourceMappingURL=user.service.d.ts.map