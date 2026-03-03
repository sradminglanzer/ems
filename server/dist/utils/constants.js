"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGES = exports.HTTP_STATUS = void 0;
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
};
exports.MESSAGES = {
    SUCCESS: {
        USER_CREATED: 'User created successfully',
        LOGIN_SUCCESS: 'Login successful',
        MPIN_SETUP_SUCCESS: 'MPIN setup successful',
        MPIN_SETUP_REQUIRED: 'MPIN setup required'
    },
    ERROR: {
        INTERNAL_SERVER_ERROR: 'Internal server error',
        INVALID_USER_DATA: 'Invalid or missing user data parameters',
        CONTACT_ALREADY_REGISTERED: 'Contact number already registered',
        USER_NOT_FOUND: 'User not found. Please contact administration.',
        MPIN_REQUIRED: 'MPIN is required for login',
        INVALID_MPIN: 'Invalid MPIN',
        TOKEN_MISSING: 'Access token missing',
        TOKEN_INVALID: 'Invalid or expired token',
        UNAUTHORIZED_ROLE: 'You do not have permission to perform this action',
        INVALID_REQUEST_DATA: 'Invalid request data'
    }
};
//# sourceMappingURL=constants.js.map