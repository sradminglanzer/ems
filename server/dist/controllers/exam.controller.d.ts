import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getExams: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createExam: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getResults: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const addResult: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=exam.controller.d.ts.map