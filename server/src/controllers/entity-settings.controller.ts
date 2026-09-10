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
        const { staffRoles, labels } = req.body;
        await entitySettingsService.updateByEntity(entityId, { staffRoles, labels });
        const updated = await entitySettingsService.getByEntity(entityId);
        res.status(HTTP_STATUS.OK).json(updated);
    } catch (error) {
        next(error);
    }
};

export const getFirebaseConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const entityId = req.user.entityId.toString();
        const config = await entitySettingsService.getFirebaseConfig(entityId);
        res.status(HTTP_STATUS.OK).json(config);
    } catch (error) {
        next(error);
    }
};

export const updateFirebaseConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const entityId = req.user.entityId.toString();
        const updated = await entitySettingsService.updateFirebaseConfig(entityId, req.body);
        res.status(HTTP_STATUS.OK).json(updated);
    } catch (error) {
        next(error);
    }
};

export const testFirebaseConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const entityId = req.user.entityId.toString();
        const { testToken } = req.body;
        const result = await entitySettingsService.testFirebaseConfig(entityId, testToken);
        res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        next(error);
    }
};
