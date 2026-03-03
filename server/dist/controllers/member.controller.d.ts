import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getMembers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createMember: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateMember: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteMember: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=member.controller.d.ts.map