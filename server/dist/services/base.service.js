"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const db_1 = require("../config/db");
class BaseService {
    collectionName;
    constructor(collectionName) {
        this.collectionName = collectionName;
    }
    getCollection() {
        return (0, db_1.getDB)().collection(this.collectionName);
    }
    async getOne(filter) {
        return await this.getCollection().findOne(filter);
    }
    async get(filter = {}, options = {}) {
        // Passing options to allow projection, sorting, etc.
        return await this.getCollection().find(filter, options).toArray();
    }
    async insert(doc) {
        return await this.getCollection().insertOne(doc);
    }
    async update(filter, updateData) {
        const result = await this.getCollection().updateOne(filter, updateData);
        return result.modifiedCount > 0;
    }
    async delete(filter) {
        const result = await this.getCollection().deleteOne(filter);
        return result.deletedCount > 0;
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=base.service.js.map