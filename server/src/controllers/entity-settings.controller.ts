import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import entitySettingsService from '../services/entity-settings.service';
import { HTTP_STATUS } from '../utils/constants';

import { AppError } from '../utils/AppError';

export const getEntitySettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const entityId = req.user.entityId.toString();
        const settings = await entitySettingsService.getByEntity(entityId);
        res.status(HTTP_STATUS.OK).json(settings);
    } catch (error) {
        next(error);
    }
};

export const updateEntitySettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const entityId = req.user.entityId.toString();
        const { staffRoles } = req.body;
        await entitySettingsService.updateByEntity(entityId, staffRoles);
        const updated = await entitySettingsService.getByEntity(entityId);
        res.status(HTTP_STATUS.OK).json(updated);
    } catch (error) {
        next(error);
    }
};
