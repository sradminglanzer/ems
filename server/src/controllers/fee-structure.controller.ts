import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import feeStructureService from '../services/fee-structure.service';
import { FeeStructure } from '../models/fee-structure.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';

export const getFeeStructures = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const structures = await feeStructureService.getByEntity(req.user!.entityId);
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
