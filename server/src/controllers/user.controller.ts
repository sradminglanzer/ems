import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import userService from '../services/user.service';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS, MESSAGES } from '../utils/constants';

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const users = await userService.getUsersByEntity(req.user!.entityId);
        res.status(HTTP_STATUS.OK).json(users);
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Merge the payload with the known entityId
        const user: User = new User({ ...req.body, entityId: req.user!.entityId });

        if (!user.valid) {
            throw new AppError(MESSAGES.ERROR.INVALID_USER_DATA, HTTP_STATUS.BAD_REQUEST);
        }

        // Zod handles all basic validation before this step, so we jump straight to service
        const result = await userService.insert(user);

        res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
        next(error);
    }
};
