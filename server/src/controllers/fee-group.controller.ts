import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import feeGroupService from '../services/fee-group.service';
import { FeeGroup } from '../models/fee-group.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';

export const getFeeGroups = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const groups = await feeGroupService.getByEntity(req.user!.entityId);
        res.status(HTTP_STATUS.OK).json(groups);
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
