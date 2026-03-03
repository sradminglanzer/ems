"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeeStructure = exports.getFeeStructures = void 0;
const fee_structure_service_1 = __importDefault(require("../services/fee-structure.service"));
const fee_structure_model_1 = require("../models/fee-structure.model");
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
const getFeeStructures = async (req, res, next) => {
    try {
        const structures = await fee_structure_service_1.default.getByEntity(req.user.entityId);
        res.status(constants_1.HTTP_STATUS.OK).json(structures);
    }
    catch (error) {
        next(error);
    }
};
exports.getFeeStructures = getFeeStructures;
const createFeeStructure = async (req, res, next) => {
    try {
        const structure = new fee_structure_model_1.FeeStructure({ ...req.body, entityId: req.user.entityId });
        if (!structure.valid) {
            throw new AppError_1.AppError('Invalid fee structure data.', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const result = await fee_structure_service_1.default.insert(structure);
        res.status(constants_1.HTTP_STATUS.CREATED).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.createFeeStructure = createFeeStructure;
//# sourceMappingURL=fee-structure.controller.js.map