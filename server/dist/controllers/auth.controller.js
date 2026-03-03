"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginOrSetup = void 0;
const auth_service_1 = __importDefault(require("../services/auth.service"));
const constants_1 = require("../utils/constants");
const loginOrSetup = async (req, res, next) => {
    try {
        const { contactNumber, mpin } = req.body;
        // Call the service layer
        const result = await auth_service_1.default.handleLoginOrSetup(contactNumber, mpin);
        // Only return 200s or expected workflow states here, errors are thrown and caught
        return res.status(constants_1.HTTP_STATUS.OK).json(result);
    }
    catch (error) {
        // Pass to global error middleware
        next(error);
    }
};
exports.loginOrSetup = loginOrSetup;
//# sourceMappingURL=auth.controller.js.map