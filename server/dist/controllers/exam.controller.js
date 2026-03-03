"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addResult = exports.getResults = exports.createExam = exports.getExams = void 0;
const exam_service_1 = __importDefault(require("../services/exam.service"));
const exam_result_service_1 = __importDefault(require("../services/exam-result.service"));
const exam_model_1 = require("../models/exam.model");
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
const getExams = async (req, res, next) => {
    try {
        const exams = await exam_service_1.default.getByEntity(req.user.entityId);
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
            throw new AppError_1.AppError('Invalid exam data. Make sure name, startDate, endDate, feeGroup, and subjects are provided.', constants_1.HTTP_STATUS.BAD_REQUEST);
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