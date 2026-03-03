"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeGroup = void 0;
const mongodb_1 = require("mongodb");
class FeeGroup {
    _id;
    entityId;
    name;
    description;
    members;
    createdAt;
    updatedAt;
    constructor(data) {
        if (data._id)
            this._id = new mongodb_1.ObjectId(data._id);
        this.entityId = new mongodb_1.ObjectId(data.entityId);
        this.name = data.name;
        this.description = data.description;
        this.members = Array.isArray(data.members) ? data.members.map((id) => new mongodb_1.ObjectId(id)) : [];
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
    get valid() {
        return !!(this.entityId && this.name);
    }
}
exports.FeeGroup = FeeGroup;
//# sourceMappingURL=fee-group.model.js.map