"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeePayment = exports.getFeePayments = void 0;
const fee_payment_service_1 = __importDefault(require("../services/fee-payment.service"));
const fee_payment_model_1 = require("../models/fee-payment.model");
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
const getFeePayments = async (req, res, next) => {
    try {
        const memberId = req.query.memberId;
        const academicYearId = req.query.academicYearId;
        let payments;
        if (memberId) {
            payments = await fee_payment_service_1.default.getByMember(memberId, req.user.entityId, academicYearId);
        }
        else {
            payments = await fee_payment_service_1.default.getByEntity(req.user.entityId, academicYearId);
        }
        res.status(constants_1.HTTP_STATUS.OK).json(payments);
    }
    catch (error) {
        next(error);
    }
};
exports.getFeePayments = getFeePayments;
const createFeePayment = async (req, res, next) => {
    try {
        const payment = new fee_payment_model_1.FeePayment({ ...req.body, entityId: req.user.entityId });
        if (!payment.valid) {
            throw new AppError_1.AppError('Invalid fee payment data', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const result = await fee_payment_service_1.default.insert(payment);
        res.status(constants_1.HTTP_STATUS.CREATED).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.createFeePayment = createFeePayment;
//# sourceMappingURL=fee-payment.controller.js.map