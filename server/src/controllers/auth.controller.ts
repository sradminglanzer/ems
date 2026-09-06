import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import memberService from '../services/member.service';
import { HTTP_STATUS } from '../utils/constants';
import { AppError } from '../utils/AppError';

export const loginOrSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { contactNumber, mpin, entityId } = req.body;

        // Call the service layer — handles Staff and Parent automatically
        const result = await authService.handleLoginOrSetup(contactNumber, entityId, mpin);

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        next(error);
    }
};

export const setParentPin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { contactNumber, newPin } = req.body;
        if (!contactNumber || !newPin || newPin.toString().trim().length !== 4) {
            throw new AppError('Valid 10-digit phone and 4-digit PIN are required', HTTP_STATUS.BAD_REQUEST);
        }
        const cleanPhone = contactNumber.toString().trim();
        const cleanPin = newPin.toString().trim();
        
        await memberService.update(
            {
                $or: [
                    { contact: cleanPhone },
                    { fatherPhone: cleanPhone },
                    { motherPhone: cleanPhone },
                    { altContact: cleanPhone },
                    { emergencyContactPhone: cleanPhone }
                ]
            },
            { $set: { parentPin: cleanPin } }
        );

        return res.status(HTTP_STATUS.OK).json({ message: '4-digit security PIN updated successfully' });
    } catch (error) {
        next(error);
    }
};
