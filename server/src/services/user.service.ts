import { User } from '../models/user.model';
import { BaseService } from './base.service';
import { ObjectId, OptionalUnlessRequiredId } from 'mongodb';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS, MESSAGES } from '../utils/constants';

class UserService extends BaseService<User> {
    constructor() {
        super('users');
    }

    async getUsersByEntity(entityId: string) {
        return await this.get(
            { entityId: new ObjectId(entityId), role: { $ne: 'owner' } },
            { projection: { mpin: 0 } }
        );
    }

    async insert(user: OptionalUnlessRequiredId<User>) {
        // Enforce business logic rules before utilizing the generic insert
        const existing = await this.getOne({ contactNumber: user.contactNumber });
        if (existing) {
            throw new AppError(MESSAGES.ERROR.CONTACT_ALREADY_REGISTERED, HTTP_STATUS.BAD_REQUEST);
        }
        return await super.insert(user);
    }
}

export default new UserService();
