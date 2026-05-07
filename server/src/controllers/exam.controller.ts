import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import examService from '../services/exam.service';
import examResultService from '../services/exam-result.service';
import memberService from '../services/member.service';
import { Exam } from '../models/exam.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';

// Indian Standard Grading
const getGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 75) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 45) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
};

export const getExams = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const academicYearId = req.query.academicYearId as string | undefined;
        const exams = await examService.getByEntity(req.user!.entityId, academicYearId);
        res.status(HTTP_STATUS.OK).json(exams);
    } catch (error) {
        next(error);
    }
};

export const createExam = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const exam = new Exam({ ...req.body, entityId: req.user!.entityId });

        if (!exam.valid) {
            throw new AppError('Invalid exam data. Make sure name, startDate, endDate, academicYearId, and subjects are provided.', HTTP_STATUS.BAD_REQUEST);
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

// GET /exams/:examId/rank-sheet — Class Leaderboard
export const getClassRankSheet = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const examId = req.params.examId as string;
        const entityId = req.user!.entityId.toString();

        const [exam, results, allMembers] = await Promise.all([
            examService.getOne({ _id: new ObjectId(examId), entityId: new ObjectId(entityId) }),
            examResultService.getByExam(examId),
            memberService.getByEntity(entityId)
        ]);

        if (!exam) throw new AppError('Exam not found', HTTP_STATUS.NOT_FOUND);

        const memberMap = new Map(allMembers.map((m: any) => [m._id.toString(), m]));

        const ranked = results
            .map((r: any) => {
                const totalScore = r.marks.reduce((sum: number, m: any) => sum + m.score, 0);
                const totalMax   = r.marks.reduce((sum: number, m: any) => sum + m.maxScore, 0);
                const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
                const grade = getGrade(percentage);
                const member = memberMap.get(r.memberId.toString());
                return {
                    memberId: r.memberId,
                    name: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
                    knownId: member?.knownId || '',
                    marks: r.marks,
                    remarks: r.remarks,
                    totalScore,
                    totalMax,
                    percentage,
                    grade,
                    passed: percentage >= 33
                };
            })
            .sort((a: any, b: any) => b.percentage - a.percentage)
            .map((s: any, i: number) => ({ ...s, rank: i + 1 }));

        res.status(HTTP_STATUS.OK).json({ exam, ranked });
    } catch (error) {
        next(error);
    }
};

// GET /exams/member/:memberId/report-card — Full year report card
export const getMemberReportCard = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const memberId = req.params.memberId as string;
        const entityId = req.user!.entityId.toString();
        const academicYearId = req.query.academicYearId as string | undefined;

        const [allResults, member] = await Promise.all([
            examResultService.getByMember(memberId),
            memberService.getOne({ _id: new ObjectId(memberId), entityId: new ObjectId(entityId) })
        ]);

        if (!member) throw new AppError('Member not found', HTTP_STATUS.NOT_FOUND);

        // Get all exam headers for these results
        const examIds = [...new Set(allResults.map((r: any) => r.examId.toString()))];
        let exams = await examService.get({ _id: { $in: examIds.map(id => new ObjectId(id)) } });

        // Filter by academic year if provided
        if (academicYearId) {
            exams = exams.filter((e: any) => e.academicYearId?.toString() === academicYearId);
        }

        // Build per-exam breakdown
        const examBreakdowns = exams.map((exam: any) => {
            const result = allResults.find((r: any) => r.examId.toString() === exam._id.toString());
            if (!result) return { exam, attempted: false };

            const totalScore = result.marks.reduce((sum: number, m: any) => sum + m.score, 0);
            const totalMax   = result.marks.reduce((sum: number, m: any) => sum + m.maxScore, 0);
            const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

            return {
                exam: { _id: exam._id, name: exam.name, startDate: exam.startDate, endDate: exam.endDate },
                attempted: true,
                marks: result.marks,
                remarks: result.remarks,
                totalScore,
                totalMax,
                percentage,
                grade: getGrade(percentage),
                passed: percentage >= 33
            };
        });

        // Cumulative summary across all attempted exams
        const attempted = examBreakdowns.filter((e: any) => e.attempted);
        const cumTotal  = attempted.reduce((sum: number, e: any) => sum + e.totalScore, 0);
        const cumMax    = attempted.reduce((sum: number, e: any) => sum + e.totalMax, 0);
        const cumPct    = cumMax > 0 ? Math.round((cumTotal / cumMax) * 100) : 0;

        res.status(HTTP_STATUS.OK).json({
            member: {
                _id: member._id,
                name: `${(member as any).firstName} ${(member as any).lastName}`,
                knownId: (member as any).knownId
            },
            examBreakdowns,
            cumulative: {
                totalScore: cumTotal,
                totalMax: cumMax,
                percentage: cumPct,
                grade: getGrade(cumPct),
                passed: cumPct >= 33,
                examsAttempted: attempted.length,
                totalExams: exams.length
            }
        });
    } catch (error) {
        next(error);
    }
};
