import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import memberService from '../services/member.service';
import feeGroupService from '../services/fee-group.service';
import feeStructureService from '../services/fee-structure.service';
import feePaymentService from '../services/fee-payment.service';
import { HTTP_STATUS } from '../utils/constants';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();

        const [members, feeGroups, feeStructures, feePayments] = await Promise.all([
            memberService.getByEntity(entityId),
            feeGroupService.getByEntity(entityId),
            feeStructureService.getByEntity(entityId),
            feePaymentService.getByEntity(entityId)
        ]);

        const groupTotalFees: Record<string, number> = {};
        feeGroups.forEach(g => {
            const groupStructures = feeStructures.filter(s => s.feeGroupId.toString() === g._id!.toString());
            const totalFee = groupStructures.reduce((sum, s) => sum + s.amount, 0);
            groupTotalFees[g._id!.toString()] = totalFee;
        });

        let systemTotalFees = 0;
        members.forEach(m => {
            const mId = m._id!.toString();
            const group = feeGroups.find(g => g.members && g.members.some((id: any) => id.toString() === mId));
            if (group) {
                systemTotalFees += (groupTotalFees[group._id!.toString()] || 0);
            }
        });

        const systemTotalPaid = feePayments.reduce((sum, p) => sum + p.amount, 0);

        const stats = {
            totalMembers: members.length,
            totalFeeGroups: feeGroups.length,
            totalPendingAmount: systemTotalFees - systemTotalPaid,
            totalCollectedAmount: systemTotalPaid
        };

        res.status(HTTP_STATUS.OK).json(stats);
    } catch (error) {
        next(error);
    }
};
