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

export const updatePaymentNextDate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const { nextPaymentDate } = req.body;

        if (!nextPaymentDate) {
            throw new AppError('Next payment date is required', HTTP_STATUS.BAD_REQUEST);
        }

        const dateObj = new Date(nextPaymentDate);
        if (isNaN(dateObj.getTime())) {
            throw new AppError('Invalid date format', HTTP_STATUS.BAD_REQUEST);
        }

        await feePaymentService.update(
            { _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId.toString()) },
            { $set: { nextPaymentDate: dateObj } }
        );

        res.status(HTTP_STATUS.OK).json({ success: true, nextPaymentDate: dateObj });
    } catch (error) {
        next(error);
    }
};

export const deleteFeePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        await feePaymentService.delete({
            _id: new ObjectId(id as string),
            entityId: new ObjectId(req.user!.entityId.toString())
        });
        res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const sendReceiptNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const payment = await feePaymentService.getOne({
            _id: new ObjectId(id as string),
            entityId: new ObjectId(req.user!.entityId.toString())
        });

        if (!payment) {
            throw new AppError('Fee payment not found', HTTP_STATUS.NOT_FOUND);
        }

        const student = await memberService.getOne({
            _id: payment.memberId,
            entityId: new ObjectId(req.user!.entityId.toString())
        });

        const studentName = student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : 'Student';
        const dateFormatted = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }) : 'Today';

        const entityId = req.user!.entityId.toString();
        const notificationService = (await import('../services/notification.service')).default;

        await notificationService.sendToStudentsParents([payment.memberId.toString()], {
            title: `🧾 Fee Payment Received - ₹${payment.amount}`,
            body: `Fee payment of ₹${payment.amount} (Receipt #${payment.receiptNo || 'N/A'}) for ${studentName} was successfully recorded on ${dateFormatted}.`,
            data: {
                type: 'fee_receipt',
                paymentId: id as string,
                memberId: payment.memberId.toString(),
                amount: (payment.amount || 0).toString()
            }
        }, entityId);

        res.status(HTTP_STATUS.OK).json({ success: true, message: 'Fee receipt notification sent to parent successfully' });
    } catch (error) {
        next(error);
    }
};

export const sendDueReminders = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { studentIds, amount, remarks } = req.body;
        const entityId = req.user!.entityId.toString();

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            throw new AppError('studentIds array is required', HTTP_STATUS.BAD_REQUEST);
        }

        const notificationService = (await import('../services/notification.service')).default;
        let sentCount = 0;

        for (const studentId of studentIds) {
            const student = await memberService.getOne({
                _id: new ObjectId(studentId),
                entityId: new ObjectId(entityId)
            });
            if (!student) continue;

            const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';
            const amountText = amount ? ` of ₹${amount}` : '';
            const remarksText = remarks ? ` (${remarks})` : '';

            await notificationService.sendToStudentsParents([studentId], {
                title: `🔔 Fee Reminder - ${studentName}`,
                body: `Dear Parent, school fee payment${amountText} for ${studentName} is pending. Please complete the payment at the earliest.${remarksText}`,
                data: {
                    type: 'fee_reminder',
                    studentId
                }
            }, entityId);
            sentCount++;
        }

        res.status(HTTP_STATUS.OK).json({
            success: true,
            sentCount,
            message: `Fee due reminders sent to parents of ${sentCount} student(s)`
        });
    } catch (error) {
        next(error);
    }
};

