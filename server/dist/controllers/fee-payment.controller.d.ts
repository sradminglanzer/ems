import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getFeePayments: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createFeePayment: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=fee-payment.controller.d.ts.map