import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getAcademicYears: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createAcademicYear: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAcademicYear: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteAcademicYear: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=academic-year.controller.d.ts.map