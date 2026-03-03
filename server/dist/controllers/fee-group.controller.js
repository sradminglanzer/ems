"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFeeGroup = exports.updateFeeGroup = exports.createFeeGroup = exports.getFeeGroups = void 0;
const fee_group_service_1 = __importDefault(require("../services/fee-group.service"));
const fee_group_model_1 = require("../models/fee-group.model");
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
const getFeeGroups = async (req, res, next) => {
    try {
        const groups = await fee_group_service_1.default.getByEntity(req.user.entityId);
        res.status(constants_1.HTTP_STATUS.OK).json(groups);
    }
    catch (error) {
        next(error);
    }
};
exports.getFeeGroups = getFeeGroups;
const createFeeGroup = async (req, res, next) => {
    try {
        const feeGroup = new fee_group_model_1.FeeGroup({ ...req.body, entityId: req.user.entityId });
        if (!feeGroup.valid) {
            throw new AppError_1.AppError('Invalid fee group data', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const result = await fee_group_service_1.default.insert(feeGroup);
        res.status(constants_1.HTTP_STATUS.CREATED).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.createFeeGroup = createFeeGroup;
const updateFeeGroup = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { ObjectId } = require('mongodb');
        // Prevent modifying entity id
        if (req.body.entityId)
            delete req.body.entityId;
        let updateData = { $set: {} };
        if (req.body.name)
            updateData.$set.name = req.body.name;
        if (req.body.description !== undefined)
            updateData.$set.description = req.body.description;
        if (req.body.members) {
            updateData.$set.members = Array.isArray(req.body.members)
                ? req.body.members.map((mId) => new ObjectId(mId))
                : [];
        }
        if (Object.keys(updateData.$set).length === 0) {
            delete updateData.$set;
        }
        const result = await fee_group_service_1.default.update({ _id: new ObjectId(id), entityId: new ObjectId(req.user.entityId) }, updateData);
        res.status(constants_1.HTTP_STATUS.OK).json({ success: true });
    }
    catch (error) {
        next(error);
    }
};
exports.updateFeeGroup = updateFeeGroup;
const deleteFeeGroup = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { ObjectId } = require('mongodb');
        const result = await fee_group_service_1.default.delete({ _id: new ObjectId(id), entityId: new ObjectId(req.user.entityId) });
        if (result) {
            res.status(constants_1.HTTP_STATUS.OK).json({ message: 'Fee group deleted' });
        }
        else {
            res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({ message: 'Fee group not found' });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.deleteFeeGroup = deleteFeeGroup;
//# sourceMappingURL=fee-group.controller.js.map