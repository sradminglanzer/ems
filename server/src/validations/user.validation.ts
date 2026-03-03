import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        contactNumber: z.string('Contact number is required').min(10, 'Contact number is too short').max(15, 'Contact number is too long'),
        mpin: z.string().length(4, 'MPIN must be exactly 4 digits').optional(),
    }),
});

export const createUserSchema = z.object({
    body: z.object({
        name: z.string('Name is required').min(2, 'Name is too short').max(100, 'Name is too long'),
        contactNumber: z.string('Contact number is required').min(10, 'Contact number is too short').max(15, 'Contact number is too long'),
        role: z.enum(['admin', 'staff', 'teacher'])
    })
});
