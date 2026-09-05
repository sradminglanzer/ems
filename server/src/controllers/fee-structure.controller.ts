import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import feeStructureService from '../services/fee-structure.service';
import { FeeStructure } from '../models/fee-structure.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';

export const getFeeStructures = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const academicYearId = req.query.academicYearId as string;
        const structures = await feeStructureService.getByEntity(req.user!.entityId, academicYearId);
        res.status(HTTP_STATUS.OK).json(structures);
    } catch (error) {
        next(error);
    }
};

export const createFeeStructure = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const structure = new FeeStructure({ ...req.body, entityId: req.user!.entityId });

        if (!structure.valid) {
            throw new AppError('Invalid fee structure data.', HTTP_STATUS.BAD_REQUEST);
        }

        const result = await feeStructureService.insert(structure);
        res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateFeeStructure = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const entityIdObj = new ObjectId(req.user!.entityId as string);
        const structureIdObj = new ObjectId(id);

        const existing = await feeStructureService.getOne({ _id: structureIdObj, entityId: entityIdObj });
        if (!existing) {
            throw new AppError('Fee structure not found', HTTP_STATUS.NOT_FOUND);
        }

        const { name, amount, frequency, academicYearId, feeGroupId, feeGroupIds, type } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (amount !== undefined) updateData.amount = Number(amount);
        if (frequency !== undefined) updateData.frequency = frequency;
        if (type !== undefined) updateData.type = type;
        if (academicYearId !== undefined) {
            updateData.academicYearId = academicYearId ? new ObjectId(academicYearId) : null;
        }
        if (feeGroupId !== undefined) {
            updateData.feeGroupId = feeGroupId ? new ObjectId(feeGroupId) : null;
        }
        if (feeGroupIds !== undefined) {
            if (Array.isArray(feeGroupIds)) {
                updateData.feeGroupIds = feeGroupIds.map((gId: string) => new ObjectId(gId));
            } else {
                updateData.feeGroupIds = [];
            }
        }
        updateData.updatedAt = new Date();

        await feeStructureService.update(
            { _id: structureIdObj, entityId: entityIdObj },
            { $set: updateData }
        );

        res.status(HTTP_STATUS.OK).json({ success: true, message: 'Fee structure updated successfully' });
    } catch (error) {
        next(error);
    }
};

export const deleteFeeStructure = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const result = await feeStructureService.delete({ _id: new ObjectId(id) });
        if (!result) {
            throw new AppError('Fee structure not found.', HTTP_STATUS.NOT_FOUND);
        }
        res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
        next(error);
    }
};
