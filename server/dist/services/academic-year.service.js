"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const base_service_1 = require("./base.service");
class AcademicYearService extends base_service_1.BaseService {
    constructor() {
        super('academic_years');
    }
    async getByEntity(entityId) {
        return this.get({ entityId: new mongodb_1.ObjectId(entityId) }, { startDate: -1 }); // Newest first
    }
}
exports.default = new AcademicYearService();
//# sourceMappingURL=academic-year.service.js.map