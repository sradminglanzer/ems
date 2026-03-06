"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_service_1 = require("./base.service");
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const academic_year_service_1 = __importDefault(require("./academic-year.service"));
const mongodb_1 = require("mongodb");
const JWT_SECRET = process.env.JWT_SECRET || 'ems_secure_jwt_key';
class AuthService extends base_service_1.BaseService {
    constructor() {
        super('users');
    }
    async handleLoginOrSetup(contactNumber, entityId, mpin) {
        let objectId;
        try {
            objectId = new mongodb_1.ObjectId(entityId);
        }
        catch (error) {
            throw new AppError_1.AppError('Invalid Entity ID format', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const user = await this.getOne({ contactNumber, entityId: objectId });
        if (!user) {
            throw new AppError_1.AppError(constants_1.MESSAGES.ERROR.USER_NOT_FOUND, constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // Setup Flow
        if (!user.mpin) {
            if (!mpin) {
                return { requiresSetup: true, message: constants_1.MESSAGES.SUCCESS.MPIN_SETUP_REQUIRED };
            }
            const hashedMpin = await bcrypt_1.default.hash(mpin, 10);
            await this.update({ _id: user._id }, { $set: { mpin: hashedMpin, updatedAt: new Date() } });
            const token = this.generateToken(user);
            const activeYear = await academic_year_service_1.default.getOne({ entityId: user.entityId, isActive: true });
            return {
                message: constants_1.MESSAGES.SUCCESS.MPIN_SETUP_SUCCESS,
                token,
                user: this.formatUserResponse(user, activeYear)
            };
        }
        // Login Flow
        if (!mpin) {
            throw new AppError_1.AppError(constants_1.MESSAGES.ERROR.MPIN_REQUIRED, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const isMatch = await bcrypt_1.default.compare(mpin, user.mpin);
        if (!isMatch) {
            throw new AppError_1.AppError(constants_1.MESSAGES.ERROR.INVALID_MPIN, constants_1.HTTP_STATUS.UNAUTHORIZED);
        }
        const token = this.generateToken(user);
        // let settings = undefined; // This block is no longer needed as settings are not returned
        // try {
        //     const { BaseService } = require('../services/base.service');
        //     const db = BaseService.getDb();
        //     // In a better architecture we'd have EntityService. Get directly for now.
        //     if (db) {
        //         const entityCol = db.collection('entities');
        //         const entity = await entityCol.findOne({ _id: user.entityId });
        //         if (entity && entity.settings) {
        //             settings = entity.settings;
        //         }
        //     }
        // } catch (e) {
        //     console.error('Error fetching entity settings during login', e)
        // }
        const activeYear = await academic_year_service_1.default.getOne({ entityId: user.entityId, isActive: true });
        return {
            message: constants_1.MESSAGES.SUCCESS.LOGIN_SUCCESS,
            token,
            user: this.formatUserResponse(user, activeYear)
        };
    }
    generateToken(user) {
        return jsonwebtoken_1.default.sign({ userId: user._id, role: user.role, entityId: user.entityId }, JWT_SECRET, { expiresIn: '7d' });
    }
    formatUserResponse(user, activeYear) {
        return {
            id: user._id,
            entityId: user.entityId,
            name: user.name,
            role: user.role,
            contactNumber: user.contactNumber,
            activeAcademicYearId: activeYear?._id,
            activeAcademicYearName: activeYear?.name
        };
    }
}
exports.default = new AuthService();
//# sourceMappingURL=auth.service.js.map