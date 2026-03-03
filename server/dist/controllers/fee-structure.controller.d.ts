import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getFeeStructures: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createFeeStructure: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=fee-structure.controller.d.ts.map