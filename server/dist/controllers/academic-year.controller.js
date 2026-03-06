"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAcademicYear = exports.updateAcademicYear = exports.createAcademicYear = exports.getAcademicYears = void 0;
const academic_year_service_1 = __importDefault(require("../services/academic-year.service"));
const academic_year_model_1 = require("../models/academic-year.model");
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
const mongodb_1 = require("mongodb");
const getAcademicYears = async (req, res, next) => {
    try {
        const years = await academic_year_service_1.default.getByEntity(req.user.entityId);
        res.status(constants_1.HTTP_STATUS.OK).json(years);
    }
    catch (error) {
        next(error);
    }
};
exports.getAcademicYears = getAcademicYears;
const createAcademicYear = async (req, res, next) => {
    try {
        const year = new academic_year_model_1.AcademicYear({ ...req.body, entityId: req.user.entityId });
        if (!year.valid) {
            throw new AppError_1.AppError('Invalid academic year data.', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // If this one is marked active, deactivate all others for this entity
        if (year.isActive) {
            await academic_year_service_1.default.updateMany({ entityId: new mongodb_1.ObjectId(req.user.entityId) }, { $set: { isActive: false } });
        }
        const result = await academic_year_service_1.default.insert(year);
        res.status(constants_1.HTTP_STATUS.CREATED).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.createAcademicYear = createAcademicYear;
const updateAcademicYear = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (req.body.entityId)
            delete req.body.entityId;
        // Validation for partial update
        let updateData = { $set: {} };
        const allowedFields = ['name', 'startDate', 'endDate', 'isActive'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData.$set[field] = req.body[field];
            }
        });
        if (Object.keys(updateData.$set).length === 0) {
            delete updateData.$set;
        }
        // If making active, deactivate others
        if (updateData.$set.isActive) {
            await academic_year_service_1.default.updateMany({ entityId: new mongodb_1.ObjectId(req.user.entityId) }, { $set: { isActive: false } });
        }
        const result = await academic_year_service_1.default.update({ _id: new mongodb_1.ObjectId(id), entityId: new mongodb_1.ObjectId(req.user.entityId) }, updateData);
        res.status(constants_1.HTTP_STATUS.OK).json({ success: true });
    }
    catch (error) {
        next(error);
    }
};
exports.updateAcademicYear = updateAcademicYear;
const deleteAcademicYear = async (req, res, next) => {
    try {
        const id = req.params.id;
        // Cannot delete active year directly, would leave system without an active year conceptually
        const year = await academic_year_service_1.default.getOne({ _id: new mongodb_1.ObjectId(id), entityId: new mongodb_1.ObjectId(req.user.entityId) });
        if (year && year.isActive) {
            throw new AppError_1.AppError('Cannot delete the currently active global academic year. Set another year as active first.', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const result = await academic_year_service_1.default.delete({ _id: new mongodb_1.ObjectId(id), entityId: new mongodb_1.ObjectId(req.user.entityId) });
        if (result) {
            res.status(constants_1.HTTP_STATUS.OK).json({ message: 'Academic Year deleted' });
        }
        else {
            res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({ message: 'Academic Year not found' });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.deleteAcademicYear = deleteAcademicYear;
//# sourceMappingURL=academic-year.controller.js.map