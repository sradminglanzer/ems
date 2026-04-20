import { Request, Response } from 'express';
import subjectService from '../services/subject.service';
import { AppError } from '../utils/AppError';
import { ObjectId } from 'mongodb';

export const getSubjects = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const subjects = await subjectService.get({ entityId: new ObjectId(entityId) }, { sort: { name: 1 } });
        res.status(200).json(subjects);
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const createSubject = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const { name, code, assignedClasses } = req.body;

        if (!name) {
            return res.status(400).json(new AppError('Subject name is required', 400));
        }

        const newSubject = {
            entityId: new ObjectId(entityId),
            name,
            code,
            assignedClasses: (assignedClasses || []).map((id: string) => new ObjectId(id)),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await subjectService.insert(newSubject);
        res.status(201).json({ ...newSubject, _id: result.insertedId });
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const updateSubject = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { entityId } = (req as any).user;

        const updatedData: any = { ...req.body, updatedAt: new Date() };
        if (updatedData._id) delete updatedData._id;
        
        if (updatedData.assignedClasses) {
            updatedData.assignedClasses = updatedData.assignedClasses.map((clId: string) => new ObjectId(clId));
        }

        const success = await subjectService.update(
            { _id: new ObjectId(id), entityId: new ObjectId(entityId) },
            { $set: updatedData }
        );

        if (!success) return res.status(404).json(new AppError('Subject not found', 404));

        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const deleteSubject = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { entityId } = (req as any).user;

        const success = await subjectService.delete({ _id: new ObjectId(id), entityId: new ObjectId(entityId) });
        
        if (!success) return res.status(404).json(new AppError('Subject not found', 404));

        res.status(200).json({ message: 'Subject deleted successfully' });
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};
