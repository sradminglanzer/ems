"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        contactNumber: zod_1.z.string('Contact number is required').min(10, 'Contact number is too short').max(15, 'Contact number is too long'),
        mpin: zod_1.z.string().length(4, 'MPIN must be exactly 4 digits').optional(),
    }),
});
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string('Name is required').min(2, 'Name is too short').max(100, 'Name is too long'),
        contactNumber: zod_1.z.string('Contact number is required').min(10, 'Contact number is too short').max(15, 'Contact number is too long'),
        role: zod_1.z.enum(['admin', 'staff', 'teacher'])
    })
});
//# sourceMappingURL=user.validation.js.map