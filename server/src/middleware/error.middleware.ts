import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS, MESSAGES } from '../utils/constants';

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let message: string = MESSAGES.ERROR.INTERNAL_SERVER_ERROR;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else {
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
