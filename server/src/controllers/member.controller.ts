import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import memberService from '../services/member.service';
import { Member } from '../models/member.model';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';

import feeGroupService from '../services/fee-group.service';
import feeStructureService from '../services/fee-structure.service';
import feePaymentService from '../services/fee-payment.service';
import userService from '../services/user.service';

export const getMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();

        let members = await memberService.getByEntity(entityId);
        if (req.user!.role === 'parent') {
            const parentUser = await userService.getOne({ _id: new ObjectId(req.user!.userId) });
            if (parentUser && parentUser.contactNumber) {
                members = members.filter(m => m.contact === parentUser.contactNumber || m.altContact === parentUser.contactNumber);
            } else {
                members = [];
            }
        }

        const [feeGroups, feeStructures, feePayments] = await Promise.all([
            feeGroupService.getByEntity(entityId),
            feeStructureService.getByEntity(entityId),
            feePaymentService.getByEntity(entityId)
        ]);

        const academicYearIdStr = req.query.academicYearId as string;

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

            // find group based on the requested academic year
            let group;
            if (academicYearIdStr) {
                group = feeGroups.find(g => {
                    const roster = g.yearlyRosters?.find((r: any) => r.academicYearId.toString() === academicYearIdStr);
                    return roster && roster.members && roster.members.some((id: any) => id.toString() === mId);
                });
            } else {
                // Fallback if no year passed: check all rosters 
                group = feeGroups.find(g => {
                    return g.yearlyRosters?.some((r: any) => r.members && r.members.some((id: any) => id.toString() === mId));
                });
            }

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

        // Auto-assign to fee group if requested inline
        if (req.body.feeGroupId && req.body.academicYearId) {
            try {
                const groupId = new ObjectId(req.body.feeGroupId as string);
                const yearId = new ObjectId(req.body.academicYearId as string);
                const memberIdObj = new ObjectId(result.insertedId.toString());

                // Fetch group
                const group = await feeGroupService.getOne({ _id: groupId, entityId: new ObjectId(req.user!.entityId) });
                if (group) {
                    let rosters = group.yearlyRosters || [];
                    const rosterIdx = rosters.findIndex((r: any) => r.academicYearId.toString() === yearId.toString());

                    if (rosterIdx > -1) {
                        let currentMembers: any[] = (rosters[rosterIdx] as any).members || [];
                        const exists = currentMembers.some((m: any) => m.toString() === memberIdObj.toString());
                        if (!exists) {
                            currentMembers.push(memberIdObj);
                        }
                        (rosters[rosterIdx] as any).members = currentMembers;
                    } else {
                        rosters.push({
                            academicYearId: yearId,
                            members: [memberIdObj]
                        });
                    }

                    await feeGroupService.update(
                        { _id: groupId, entityId: new ObjectId(req.user!.entityId) },
                        { $set: { yearlyRosters: rosters } }
                    );
                }
            } catch (e: any) {
                console.error('Error auto-enrolling into fee group during member creation:', e);
            }
        }

        // Ensure a parent user exists for this contact number
        try {
            if (member.contact) {
                const existingParent = await userService.getOne({
                    entityId: new ObjectId(req.user!.entityId),
                    contactNumber: member.contact
                });
                if (!existingParent) {
                    const newUser = new User({
                        entityId: new ObjectId(req.user!.entityId),
                        name: `Parent of ${member.firstName}`,
                        contactNumber: member.contact,
                        role: 'parent',
                        mpin: '' // Require setup
                    });
                    await userService.insert(newUser);
                }
            }
        } catch (e: any) {
            console.error('Error auto-creating parent user:', e);
        }

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
