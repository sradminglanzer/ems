import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import feePaymentService from '../services/fee-payment.service';
import { FeePayment } from '../models/fee-payment.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';

export const getFeePayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const memberId = req.query.memberId as string | undefined;
        const academicYearId = req.query.academicYearId as string | undefined;
        let payments;

        if (memberId) {
            payments = await feePaymentService.getByMember(memberId, req.user!.entityId, academicYearId);
        } else {
            payments = await feePaymentService.getByEntity(req.user!.entityId, academicYearId);
        }
        res.status(HTTP_STATUS.OK).json(payments);
    } catch (error) {
        next(error);
    }
};

export const createFeePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (req.body.payments && Array.isArray(req.body.payments)) {
            const results = [];
            for (let p of req.body.payments) {
                const payment = new FeePayment({ ...p, entityId: req.user!.entityId });
                if (payment.valid) {
                    payment.receiptNo = await feePaymentService.getNextSequence(req.user!.entityId);
                    const result = await feePaymentService.insert(payment);
                    results.push({ ...payment, _id: result.insertedId });
                }
            }
            return res.status(HTTP_STATUS.CREATED).json(results);
        }

        const payment = new FeePayment({ ...req.body, entityId: req.user!.entityId });

        if (!payment.valid) {
            throw new AppError('Invalid fee payment data', HTTP_STATUS.BAD_REQUEST);
        }

        payment.receiptNo = await feePaymentService.getNextSequence(req.user!.entityId);
        const result = await feePaymentService.insert(payment);
        res.status(HTTP_STATUS.CREATED).json({ ...payment, _id: result.insertedId });
    } catch (error) {
        next(error);
    }
};

export const setSequence = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { nextSequence } = req.body;
        if (nextSequence == null || isNaN(nextSequence)) {
            throw new AppError('Invalid sequence number', HTTP_STATUS.BAD_REQUEST);
        }
        
        await feePaymentService.setNextSequence(req.user!.entityId, Number(nextSequence));
        res.status(HTTP_STATUS.OK).json({ message: 'Sequence updated successfully' });
    } catch (error) {
        next(error);
    }
};
