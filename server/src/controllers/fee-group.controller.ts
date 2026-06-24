import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import feeGroupService from '../services/fee-group.service';
import memberService from '../services/member.service';
import feeStructureService from '../services/fee-structure.service';
import academicYearService from '../services/academic-year.service';
import { FeeGroup } from '../models/fee-group.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';

export const getFeeGroups = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const groups = await feeGroupService.getByEntity(req.user!.entityId);
        res.status(HTTP_STATUS.OK).json(groups);
    } catch (error) {
        next(error);
    }
};

export const getFeeGroupDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const academicYearId = req.query.academicYearId as string;

        const entityIdObj = new ObjectId(req.user!.entityId as string);
        const groupIdObj = new ObjectId(id);

        const group = await feeGroupService.getOne({ _id: groupIdObj, entityId: entityIdObj } as any);
        if (!group) throw new AppError('Fee group not found', HTTP_STATUS.NOT_FOUND);

        let memberIdObjects: ObjectId[] = [];
        if (academicYearId && group.yearlyRosters) {
            const roster = (group.yearlyRosters as any[]).find((r: any) => r.academicYearId.toString() === academicYearId);
            if (roster && roster.members) {
                memberIdObjects = (roster.members as any[]).map((mId: any) => new ObjectId(mId.toString()));
            }
        } else if (!academicYearId && group.members) {
            memberIdObjects = (group.members as any[]).map((mId: any) => new ObjectId(mId.toString()));
        }

        // Parallel fetch using services — no raw DB access
        const [members, feeStructures, academicYears, allGroups] = await Promise.all([
            memberIdObjects.length > 0
                ? memberService.get({ _id: { $in: memberIdObjects }, entityId: entityIdObj } as any)
                : Promise.resolve([]),
            feeStructureService.get({ feeGroupId: groupIdObj, entityId: entityIdObj } as any),
            academicYearService.getByEntity(req.user!.entityId as string),
            feeGroupService.getByEntity(req.user!.entityId as string)
        ]);

        res.status(HTTP_STATUS.OK).json({
            group,
            members,
            feeStructures,
            academicYears,
            allGroups
        });
    } catch (error) {
        next(error);
    }
};

export const createFeeGroup = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const feeGroup = new FeeGroup({ ...req.body, entityId: req.user!.entityId });

        if (!feeGroup.valid) {
            throw new AppError('Invalid fee group data', HTTP_STATUS.BAD_REQUEST);
        }

        const result = await feeGroupService.insert(feeGroup);
        res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateFeeGroup = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const { ObjectId } = require('mongodb');

        // Prevent modifying entity id
        if (req.body.entityId) delete req.body.entityId;

        let updateData: any = { $set: {} };
        if (req.body.name) updateData.$set.name = req.body.name;
        if (req.body.description !== undefined) updateData.$set.description = req.body.description;

        // Extract updateData keys properly to pass directly if only name/description updated
        if (Object.keys(updateData.$set).length === 0) {
            delete updateData.$set;
        }

        // If trying to update members, we must handle it via yearlyRosters
        if (req.body.members && req.body.academicYearId) {
            const academicYearIdStr = req.body.academicYearId as string;
            const newMembers = Array.isArray(req.body.members)
                ? req.body.members.map((mId: string) => new ObjectId(mId))
                : [];

            // We need to fetch the document first to properly upsert the roster array
            const group = await feeGroupService.getOne({ _id: new ObjectId(id), entityId: new ObjectId(req.user!.entityId) });
            if (!group) throw new AppError('Fee group not found', HTTP_STATUS.NOT_FOUND);

            let rosters = group.yearlyRosters || [];
            const rosterIdx = rosters.findIndex((r: any) => r.academicYearId.toString() === academicYearIdStr);

            if (rosterIdx > -1 && rosters[rosterIdx]) {
                // Update existing roster
                rosters[rosterIdx].members = newMembers;
            } else {
                // Add new roster for this year
                rosters.push({
                    academicYearId: new ObjectId(academicYearIdStr),
                    members: newMembers
                });
            }

            if (!updateData.$set) {
                updateData.$set = {};
            }
            updateData.$set.yearlyRosters = rosters;
        } else if (req.body.members && !req.body.academicYearId) {
            throw new AppError('academicYearId is required when updating members', HTTP_STATUS.BAD_REQUEST);
        }

        if (updateData && updateData.$set && Object.keys(updateData.$set).length > 0) {
            await feeGroupService.update(
                { _id: new ObjectId(id), entityId: new ObjectId(req.user!.entityId) },
                updateData
            );
        }

        res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const deleteFeeGroup = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const { ObjectId } = require('mongodb');
        const result = await feeGroupService.delete({ _id: new ObjectId(id), entityId: new ObjectId(req.user!.entityId) });

        if (result) {
            res.status(HTTP_STATUS.OK).json({ message: 'Fee group deleted' });
        } else {
            res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Fee group not found' });
        }
    } catch (error) {
        next(error);
    }
};

export const addMemberToGroup = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const { memberId, academicYearId } = req.body;
        const { ObjectId } = require('mongodb');

        if (!memberId || !academicYearId) {
            throw new AppError('memberId and academicYearId are required', HTTP_STATUS.BAD_REQUEST);
        }

        const group = await feeGroupService.getOne({ _id: new ObjectId(id), entityId: new ObjectId(req.user!.entityId) });
        if (!group) throw new AppError('Fee group not found', HTTP_STATUS.NOT_FOUND);

        let rosters = group.yearlyRosters || [];
        const rosterIdx = rosters.findIndex((r: any) => r.academicYearId.toString() === academicYearId.toString());

        const newMemberObjId = new ObjectId(memberId);

        if (rosterIdx > -1) {
            // Check if exists to avoid duplicates
            let currentMembers: any[] = (rosters[rosterIdx] as any).members || [];
            const exists = currentMembers.some((m: any) => m.toString() === newMemberObjId.toString());
            if (!exists) {
                currentMembers.push(newMemberObjId);
            }
            (rosters[rosterIdx] as any).members = currentMembers;
        } else {
            rosters.push({
                academicYearId: new ObjectId(academicYearId),
                members: [newMemberObjId]
            });
        }

        await feeGroupService.update(
            { _id: new ObjectId(id), entityId: new ObjectId(req.user!.entityId) },
            { $set: { yearlyRosters: rosters } }
        );

        res.status(HTTP_STATUS.OK).json({ success: true, message: 'Member added to group' });
    } catch (error) {
        next(error);
    }
};
