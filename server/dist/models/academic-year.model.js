"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicYear = void 0;
const mongodb_1 = require("mongodb");
class AcademicYear {
    _id;
    entityId;
    name;
    startDate; // ISO String (YYYY-MM-DD)
    endDate; // ISO String (YYYY-MM-DD)
    isActive;
    createdAt;
    updatedAt;
    constructor(data) {
        if (data._id)
            this._id = new mongodb_1.ObjectId(data._id);
        this.entityId = new mongodb_1.ObjectId(data.entityId);
        this.name = data.name;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.isActive = !!data.isActive;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
    get valid() {
        return !!(this.entityId && this.name && this.startDate && this.endDate);
    }
}
exports.AcademicYear = AcademicYear;
//# sourceMappingURL=academic-year.model.js.map