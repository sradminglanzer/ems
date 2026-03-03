import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getFeeGroups: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createFeeGroup: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateFeeGroup: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteFeeGroup: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=fee-group.controller.d.ts.map