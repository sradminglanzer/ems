"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const constants_1 = require("../utils/constants");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            // Validate body, query, and params against the schema
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // @ts-ignore - ZodError generic typing mismatch in middleware
                const errorMessages = error.errors.map((issue) => ({
                    message: `${issue.path.join('.')} is ${issue.message}`,
                }));
                // Pass to global error handler
                res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                    status: 'error',
                    statusCode: constants_1.HTTP_STATUS.BAD_REQUEST,
                    message: constants_1.MESSAGES.ERROR.INVALID_REQUEST_DATA,
                    errors: errorMessages
                });
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validate.middleware.js.map