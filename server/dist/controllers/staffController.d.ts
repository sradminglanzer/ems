import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
export declare const getStaff: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createStaff: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=staffController.d.ts.map