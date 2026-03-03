"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_service_1 = require("./base.service");
const mongodb_1 = require("mongodb");
class ExamService extends base_service_1.BaseService {
    constructor() {
        super('exams');
    }
    async getByEntity(entityId) {
        return await this.get({ entityId: new mongodb_1.ObjectId(entityId) });
    }
}
exports.default = new ExamService();
//# sourceMappingURL=exam.service.js.map