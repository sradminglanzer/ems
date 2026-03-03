"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_service_1 = require("./base.service");
const mongodb_1 = require("mongodb");
class MemberService extends base_service_1.BaseService {
    constructor() {
        super('members');
    }
    async getByEntity(entityId) {
        const collection = await this.getCollection();
        return collection.find({ entityId: new mongodb_1.ObjectId(entityId) }).toArray();
    }
}
exports.default = new MemberService();
//# sourceMappingURL=member.service.js.map