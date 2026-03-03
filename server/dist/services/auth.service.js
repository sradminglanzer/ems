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
const JWT_SECRET = process.env.JWT_SECRET || 'ems_secure_jwt_key';
class AuthService extends base_service_1.BaseService {
    constructor() {
        super('users');
    }
    async handleLoginOrSetup(contactNumber, mpin) {
        const user = await this.getOne({ contactNumber });
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
            return {
                message: constants_1.MESSAGES.SUCCESS.MPIN_SETUP_SUCCESS,
                token,
                user: this.formatUserResponse(user)
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
        return {
            message: constants_1.MESSAGES.SUCCESS.LOGIN_SUCCESS,
            token,
            user: this.formatUserResponse(user)
        };
    }
    generateToken(user) {
        return jsonwebtoken_1.default.sign({ userId: user._id, role: user.role, entityId: user.entityId }, JWT_SECRET, { expiresIn: '7d' });
    }
    formatUserResponse(user) {
        return { id: user._id, name: user.name, role: user.role };
    }
}
exports.default = new AuthService();
//# sourceMappingURL=auth.service.js.map