"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AppError_1 = require("../utils/AppError");
const constants_1 = require("../utils/constants");
const errorHandler = (err, req, res, next) => {
    let statusCode = constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let message = constants_1.MESSAGES.ERROR.INTERNAL_SERVER_ERROR;
    if (err instanceof AppError_1.AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    else {
        // Log unexpected errors heavily in production
        console.error('Unhandled Exception:', err);
    }
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map