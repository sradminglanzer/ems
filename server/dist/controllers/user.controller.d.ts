import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getUsers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=user.controller.d.ts.map