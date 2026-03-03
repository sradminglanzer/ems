import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import memberService from '../services/member.service';
import { Member } from '../models/member.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';

import feeGroupService from '../services/fee-group.service';
import feeStructureService from '../services/fee-structure.service';
import feePaymentService from '../services/fee-payment.service';

export const getMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const members = await memberService.getByEntity(entityId);

        const [feeGroups, feeStructures, feePayments] = await Promise.all([
            feeGroupService.getByEntity(entityId),
            feeStructureService.getByEntity(entityId),
            feePaymentService.getByEntity(entityId)
        ]);

        // Calculate total structural fees per group
        const groupTotalFees: Record<string, number> = {};
        feeGroups.forEach(g => {
            const groupStructures = feeStructures.filter(s => s.feeGroupId.toString() === g._id!.toString());
            const totalFee = groupStructures.reduce((sum, s) => sum + s.amount, 0);
            groupTotalFees[g._id!.toString()] = totalFee;
        });

        // Enrich members with group and fee stats
        const memberStats = members.map(m => {
            const mId = m._id!.toString();
            // find group
            const group = feeGroups.find(g => g.members && g.members.some((id: any) => id.toString() === mId));

            let totalFee = 0;
            let groupName = 'Unassigned';

            if (group) {
                totalFee = groupTotalFees[group._id!.toString()] || 0;
                groupName = group.name;
            }

            // find payments
            const memberPayments = feePayments.filter(p => p.memberId.toString() === mId);
            const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount, 0);

            return {
                ...m,
                groupName,
                totalFee,
                totalPaid,
                pendingAmount: totalFee - totalPaid
            };
        });

        res.status(HTTP_STATUS.OK).json(memberStats);
    } catch (error) {
        next(error);
    }
};

export const createMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const member = new Member({ ...req.body, entityId: req.user!.entityId });

        if (!member.valid) {
            throw new AppError('Invalid member data. First Name, Last Name and Known ID are required.', HTTP_STATUS.BAD_REQUEST);
        }

        const result = await memberService.insert(member);
        res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        if (req.body.entityId) delete req.body.entityId;

        // Validation for partial update
        let updateData: any = { $set: {} };
        const allowedFields = ['firstName', 'middleName', 'lastName', 'knownId', 'dob', 'contact', 'altContact', 'fatherOccupation', 'motherOccupation', 'address'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData.$set[field] = req.body[field];
            }
        });

        if (Object.keys(updateData.$set).length === 0) {
            delete updateData.$set;
        }

        const result = await memberService.update(
            { _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId) },
            updateData
        );

        res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const deleteMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const result = await memberService.delete({ _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId) });

        if (result) {
            res.status(HTTP_STATUS.OK).json({ message: 'Member deleted' });
        } else {
            res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Member not found' });
        }
    } catch (error) {
        next(error);
    }
};
