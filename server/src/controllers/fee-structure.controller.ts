import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import feeStructureService from '../services/fee-structure.service';
import { FeeStructure } from '../models/fee-structure.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';

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
