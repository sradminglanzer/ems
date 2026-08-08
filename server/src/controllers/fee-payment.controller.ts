import { Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AuthRequest } from '../middleware/auth.middleware';
import feePaymentService from '../services/fee-payment.service';
import memberService from '../services/member.service';
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
            const memberFeeStructures = new Map<string, string[]>();

            for (let p of req.body.payments) {
                const payment = new FeePayment({ ...p, entityId: req.user!.entityId });
                if (payment.valid) {
                    payment.receiptNo = await feePaymentService.getNextSequence(req.user!.entityId);
                    const result = await feePaymentService.insert(payment);
                    results.push({ ...payment, _id: result.insertedId });

                    if (payment.memberId && payment.feeStructureId) {
                        const mId = payment.memberId.toString();
                        const fId = payment.feeStructureId.toString();
                        if (!memberFeeStructures.has(mId)) {
                            memberFeeStructures.set(mId, []);
                        }
                        memberFeeStructures.get(mId)!.push(fId);
                    }
                }
            }

            // Sync member's addonFeeIds with paid fee structures so active subscriptions reflect collected add-ons/plans
            for (const [mId, structIds] of memberFeeStructures.entries()) {
                const member = await memberService.getOne({ _id: new ObjectId(mId), entityId: new ObjectId(req.user!.entityId.toString()) });
                if (member) {
                    const existingAddonIds = (member.addonFeeIds || []).map((id: any) => id.toString());
                    const updatedAddonIds = Array.from(new Set([...existingAddonIds, ...structIds])).map(id => new ObjectId(id));
                    await memberService.update(
                        { _id: new ObjectId(mId), entityId: new ObjectId(req.user!.entityId.toString()) },
                        { $set: { addonFeeIds: updatedAddonIds } }
                    );
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

        if (payment.memberId && payment.feeStructureId) {
            const mId = payment.memberId.toString();
            const fId = payment.feeStructureId.toString();
            const member = await memberService.getOne({ _id: new ObjectId(mId), entityId: new ObjectId(req.user!.entityId.toString()) });
            if (member) {
                const existingAddonIds = (member.addonFeeIds || []).map((id: any) => id.toString());
                if (!existingAddonIds.includes(fId)) {
                    const updatedAddonIds = [...existingAddonIds.map(id => new ObjectId(id)), new ObjectId(fId)];
                    await memberService.update(
                        { _id: new ObjectId(mId), entityId: new ObjectId(req.user!.entityId.toString()) },
                        { $set: { addonFeeIds: updatedAddonIds } }
                    );
                }
            }
        }

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
