"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongodb_1 = require("mongodb");
class User {
    _id;
    entityId;
    name;
    contactNumber;
    mpin; // Optional initially as they need to set it up
    role;
    createdAt;
    updatedAt;
    constructor(data) {
        this.entityId = typeof data.entityId === 'string' ? new mongodb_1.ObjectId(data.entityId) : data.entityId;
        this.name = data.name;
        this.contactNumber = data.contactNumber;
        this.role = data.role;
        this.mpin = data.mpin || '';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
    get valid() {
        if (!this.entityId || !this.name || !this.contactNumber || !this.role) {
            return false;
        }
        return true;
    }
}
exports.User = User;
//# sourceMappingURL=user.model.js.map