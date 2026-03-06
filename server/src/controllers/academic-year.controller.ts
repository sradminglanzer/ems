import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import academicYearService from '../services/academic-year.service';
import { AcademicYear } from '../models/academic-year.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';

export const getAcademicYears = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const years = await academicYearService.getByEntity(req.user!.entityId);
        res.status(HTTP_STATUS.OK).json(years);
    } catch (error) {
        next(error);
    }
};

export const createAcademicYear = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const year = new AcademicYear({ ...req.body, entityId: req.user!.entityId });

        if (!year.valid) {
            throw new AppError('Invalid academic year data.', HTTP_STATUS.BAD_REQUEST);
        }

        // If this one is marked active, deactivate all others for this entity
        if (year.isActive) {
            await academicYearService.updateMany(
                { entityId: new ObjectId(req.user!.entityId) },
                { $set: { isActive: false } }
            );
        }

        const result = await academicYearService.insert(year);
        res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateAcademicYear = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        if (req.body.entityId) delete req.body.entityId;

        // Validation for partial update
        let updateData: any = { $set: {} };
        const allowedFields = ['name', 'startDate', 'endDate', 'isActive'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData.$set[field] = req.body[field];
            }
        });

        if (Object.keys(updateData.$set).length === 0) {
            delete updateData.$set;
        }

        // If making active, deactivate others
        if (updateData.$set.isActive) {
            await academicYearService.updateMany(
                { entityId: new ObjectId(req.user!.entityId) },
                { $set: { isActive: false } }
            );
        }

        const result = await academicYearService.update(
            { _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId) },
            updateData
        );

        res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const deleteAcademicYear = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;

        // Cannot delete active year directly, would leave system without an active year conceptually
        const year = await academicYearService.getOne({ _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId) });
        if (year && year.isActive) {
            throw new AppError('Cannot delete the currently active global academic year. Set another year as active first.', HTTP_STATUS.BAD_REQUEST);
        }

        const result = await academicYearService.delete({ _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId) });

        if (result) {
            res.status(HTTP_STATUS.OK).json({ message: 'Academic Year deleted' });
        } else {
            res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Academic Year not found' });
        }
    } catch (error) {
        next(error);
    }
};
