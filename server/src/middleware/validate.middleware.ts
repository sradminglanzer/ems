import { Request, Response, NextFunction } from 'express';
import { Schema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS, MESSAGES } from '../utils/constants';

export const validateRequest = (schema: Schema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate body, query, and params against the schema
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error: any) {
            console.log('Errors..... ', error);

            if (error instanceof ZodError) {
                // @ts-ignore - ZodError generic typing mismatch in middleware
                const errorMessages = error.errors.map((issue: any) => ({
                    message: `${issue.path.join('.')} is ${issue.message}`,
                }));

                // Pass to global error handler
                res.status(HTTP_STATUS.BAD_REQUEST).json({
                    status: 'error',
                    statusCode: HTTP_STATUS.BAD_REQUEST,
                    message: MESSAGES.ERROR.INVALID_REQUEST_DATA,
                    errors: errorMessages
                });
            } else {
                next(error);
            }
        }
    };
};
