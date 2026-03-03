import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import examService from '../services/exam.service';
import examResultService from '../services/exam-result.service';
import { Exam } from '../models/exam.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';

export const getExams = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const exams = await examService.getByEntity(req.user!.entityId);
        res.status(HTTP_STATUS.OK).json(exams);
    } catch (error) {
        next(error);
    }
};

export const createExam = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const exam = new Exam({ ...req.body, entityId: req.user!.entityId });

        if (!exam.valid) {
            throw new AppError('Invalid exam data. Make sure name, startDate, endDate, and subjects are provided.', HTTP_STATUS.BAD_REQUEST);
        }

        const result = await examService.insert(exam);
        res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
        next(error);
    }
};

export const getResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const examId = req.params.examId as string;
        const results = await examResultService.getByExam(examId);
        res.status(HTTP_STATUS.OK).json(results);
    } catch (error) {
        next(error);
    }
};

export const getMemberResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const memberId = req.params.memberId as string;
        const results = await examResultService.getByMember(memberId);

        // Also fetch exam headers so frontend has the exam names
        const examIds = [...new Set(results.map(r => r.examId.toString()))];
        const exams = await examService.get({ _id: { $in: examIds.map(id => new ObjectId(id)) } });

        const enrichedResults = results.map(r => {
            const exam = exams.find(e => e._id!.toString() === r.examId.toString());
            return { ...r, examName: exam?.name };
        });

        res.status(HTTP_STATUS.OK).json(enrichedResults);
    } catch (error) {
        next(error);
    }
};

export const addResult = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const examId = req.params.examId as string;
        const results = req.body.results as any[];

        if (!Array.isArray(results)) {
            throw new AppError('Results must be an array', HTTP_STATUS.BAD_REQUEST);
        }

        const result = await examResultService.saveBulk(examId, req.user!.entityId, results);
        res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
        next(error);
    }
};
