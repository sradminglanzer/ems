export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly INTERNAL_SERVER_ERROR: 500;
};
export declare const MESSAGES: {
    readonly SUCCESS: {
        readonly USER_CREATED: "User created successfully";
        readonly LOGIN_SUCCESS: "Login successful";
        readonly MPIN_SETUP_SUCCESS: "MPIN setup successful";
        readonly MPIN_SETUP_REQUIRED: "MPIN setup required";
    };
    readonly ERROR: {
        readonly INTERNAL_SERVER_ERROR: "Internal server error";
        readonly INVALID_USER_DATA: "Invalid or missing user data parameters";
        readonly CONTACT_ALREADY_REGISTERED: "Contact number already registered";
        readonly USER_NOT_FOUND: "User not found. Please contact administration.";
        readonly MPIN_REQUIRED: "MPIN is required for login";
        readonly INVALID_MPIN: "Invalid MPIN";
        readonly TOKEN_MISSING: "Access token missing";
        readonly TOKEN_INVALID: "Invalid or expired token";
        readonly UNAUTHORIZED_ROLE: "You do not have permission to perform this action";
        readonly INVALID_REQUEST_DATA: "Invalid request data";
    };
};
//# sourceMappingURL=constants.d.ts.map