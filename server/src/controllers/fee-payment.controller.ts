import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import feePaymentService from '../services/fee-payment.service';
import { FeePayment } from '../models/fee-payment.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';

export const getFeePayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const memberId = req.query.memberId as string;
        let payments;
        if (memberId) {
            payments = await feePaymentService.getByMember(memberId, req.user!.entityId.toString());
        } else {
            payments = await feePaymentService.getByEntity(req.user!.entityId.toString());
        }
        res.status(HTTP_STATUS.OK).json(payments);
    } catch (error) {
        next(error);
    }
};

export const createFeePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const payment = new FeePayment({ ...req.body, entityId: req.user!.entityId });

        if (!payment.valid) {
            throw new AppError('Invalid fee payment data', HTTP_STATUS.BAD_REQUEST);
        }

        const result = await feePaymentService.insert(payment);
        res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
        next(error);
    }
};
