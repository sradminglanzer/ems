import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { HTTP_STATUS } from '../utils/constants';

export const loginOrSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { contactNumber, mpin } = req.body;

        // Call the service layer
        const result = await authService.handleLoginOrSetup(contactNumber, mpin);

        // Only return 200s or expected workflow states here, errors are thrown and caught
        return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
        // Pass to global error middleware
        next(error);
    }
}
