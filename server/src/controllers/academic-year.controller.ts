import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import academicYearService from '../services/academic-year.service';
import { AcademicYear } from '../models/academic-year.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';

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
        const entityId = new ObjectId(req.user!.entityId);
        const yearId = new ObjectId(id as string);

        const year = await academicYearService.getOne({ _id: yearId, entityId });
        if (!year) {
            throw new AppError('Academic Year not found.', HTTP_STATUS.NOT_FOUND);
        }

        if (year.isActive) {
            throw new AppError('Cannot delete the currently active global academic year. Set another year as active first.', HTTP_STATUS.BAD_REQUEST);
        }

        // Check for linked dependencies (Block Deletion policy)
        const db = getDB();
        const [examsCount, diaryCount, paymentsCount, rostersCount] = await Promise.all([
            db.collection('exams').countDocuments({ entityId, academicYearId: yearId }),
            db.collection('diary').countDocuments({ entityId, academicYearId: yearId }),
            db.collection('fee_payments').countDocuments({ entityId, academicYearId: yearId }),
            db.collection('members').countDocuments({ entityId, 'yearlyRosters.academicYearId': yearId })
        ]);

        const linkedItems: string[] = [];
        if (examsCount > 0) linkedItems.push(`${examsCount} exam(s)`);
        if (diaryCount > 0) linkedItems.push(`${diaryCount} diary entry(ies)`);
        if (paymentsCount > 0) linkedItems.push(`${paymentsCount} fee payment(s)`);
        if (rostersCount > 0) linkedItems.push(`${rostersCount} student roster entry(ies)`);

        if (linkedItems.length > 0) {
            throw new AppError(
                `Cannot delete academic year "${year.name}": it has linked records (${linkedItems.join(', ')}). Please remove or reassign linked records first.`,
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const result = await academicYearService.delete({ _id: yearId, entityId });

        if (result) {
            res.status(HTTP_STATUS.OK).json({ message: 'Academic Year deleted successfully.' });
        } else {
            res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Academic Year not found.' });
        }
    } catch (error) {
        next(error);
    }
};
