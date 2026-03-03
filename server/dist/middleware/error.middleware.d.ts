import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
export declare const errorHandler: (err: Error | AppError, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=error.middleware.d.ts.map