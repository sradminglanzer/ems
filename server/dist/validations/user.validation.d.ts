import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        contactNumber: z.ZodString;
        mpin: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const createUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        contactNumber: z.ZodString;
        role: z.ZodEnum<{
            admin: "admin";
            staff: "staff";
            teacher: "teacher";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=user.validation.d.ts.map