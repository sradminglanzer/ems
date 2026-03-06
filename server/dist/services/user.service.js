"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_service_1 = require("./base.service");
const mongodb_1 = require("mongodb");
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
class UserService extends base_service_1.BaseService {
    constructor() {
        super('users');
    }
    async getUsersByEntity(entityId) {
        return await this.get({ entityId: new mongodb_1.ObjectId(entityId), role: { $ne: 'owner' } }, { projection: { mpin: 0 } });
    }
    async insert(user) {
        // Enforce business logic rules before utilizing the generic insert
        const existing = await this.getOne({ contactNumber: user.contactNumber, entityId: user.entityId });
        if (existing) {
            throw new AppError_1.AppError(constants_1.MESSAGES.ERROR.CONTACT_ALREADY_REGISTERED, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        return await super.insert(user);
    }
}
exports.default = new UserService();
//# sourceMappingURL=user.service.js.map