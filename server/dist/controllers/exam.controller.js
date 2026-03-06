"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addResult = exports.getMemberResults = exports.getResults = exports.createExam = exports.getExams = void 0;
const exam_service_1 = __importDefault(require("../services/exam.service"));
const exam_result_service_1 = __importDefault(require("../services/exam-result.service"));
const exam_model_1 = require("../models/exam.model");
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
const mongodb_1 = require("mongodb");
const getExams = async (req, res, next) => {
    try {
        const academicYearId = req.query.academicYearId;
        const exams = await exam_service_1.default.getByEntity(req.user.entityId, academicYearId);
        res.status(constants_1.HTTP_STATUS.OK).json(exams);
    }
    catch (error) {
        next(error);
    }
};
exports.getExams = getExams;
const createExam = async (req, res, next) => {
    try {
        const exam = new exam_model_1.Exam({ ...req.body, entityId: req.user.entityId });
        if (!exam.valid) {
            throw new AppError_1.AppError('Invalid exam data. Make sure name, startDate, endDate, academicYearId, and subjects are provided.', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const result = await exam_service_1.default.insert(exam);
        res.status(constants_1.HTTP_STATUS.CREATED).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.createExam = createExam;
const getResults = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        const results = await exam_result_service_1.default.getByExam(examId);
        res.status(constants_1.HTTP_STATUS.OK).json(results);
    }
    catch (error) {
        next(error);
    }
};
exports.getResults = getResults;
const getMemberResults = async (req, res, next) => {
    try {
        const memberId = req.params.memberId;
        const results = await exam_result_service_1.default.getByMember(memberId);
        // Also fetch exam headers so frontend has the exam names
        const examIds = [...new Set(results.map(r => r.examId.toString()))];
        const exams = await exam_service_1.default.get({ _id: { $in: examIds.map(id => new mongodb_1.ObjectId(id)) } });
        const enrichedResults = results.map(r => {
            const exam = exams.find(e => e._id.toString() === r.examId.toString());
            return { ...r, examName: exam?.name };
        });
        res.status(constants_1.HTTP_STATUS.OK).json(enrichedResults);
    }
    catch (error) {
        next(error);
    }
};
exports.getMemberResults = getMemberResults;
const addResult = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        const results = req.body.results;
        if (!Array.isArray(results)) {
            throw new AppError_1.AppError('Results must be an array', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const result = await exam_result_service_1.default.saveBulk(examId, req.user.entityId, results);
        res.status(constants_1.HTTP_STATUS.CREATED).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.addResult = addResult;
//# sourceMappingURL=exam.controller.js.map