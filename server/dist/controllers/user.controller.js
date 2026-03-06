"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.createUser = exports.getUsers = void 0;
const user_service_1 = __importDefault(require("../services/user.service"));
const user_model_1 = require("../models/user.model");
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
const mongodb_1 = require("mongodb");
const getUsers = async (req, res, next) => {
    try {
        const users = await user_service_1.default.getUsersByEntity(req.user.entityId);
        res.status(constants_1.HTTP_STATUS.OK).json(users);
    }
    catch (error) {
        next(error);
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res, next) => {
    try {
        // Merge the payload with the known entityId
        const user = new user_model_1.User({ ...req.body, entityId: req.user.entityId });
        if (!user.valid) {
            throw new AppError_1.AppError(constants_1.MESSAGES.ERROR.INVALID_USER_DATA, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Zod handles all basic validation before this step, so we jump straight to service
        const result = await user_service_1.default.insert(user);
        res.status(constants_1.HTTP_STATUS.CREATED).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.createUser = createUser;
const deleteUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        if (userId === req.user.userId) {
            throw new AppError_1.AppError('Cannot delete your own account', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const user = await user_service_1.default.getOne({ _id: new mongodb_1.ObjectId(userId) });
        if (!user || user.entityId.toString() !== req.user.entityId.toString()) {
            throw new AppError_1.AppError('User not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        if (user.role === 'owner') {
            throw new AppError_1.AppError('Cannot delete an owner account', constants_1.HTTP_STATUS.FORBIDDEN);
        }
        await user_service_1.default.delete({ _id: new mongodb_1.ObjectId(userId) });
        res.status(constants_1.HTTP_STATUS.OK).json({ message: 'User deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=user.controller.js.map