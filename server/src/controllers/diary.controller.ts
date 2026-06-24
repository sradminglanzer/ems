import { Request, Response } from 'express';
import diaryService from '../services/diary.service';
import feeGroupService from '../services/fee-group.service';
import { AppError } from '../utils/AppError';
import { ObjectId } from 'mongodb';

export const getDiaryFeed = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const { classId, academicYearId } = req.query;

        if (!classId) return res.status(400).json(new AppError('classId is required', 400));

        const filter: any = { 
            entityId: new ObjectId(entityId), 
            classId: new ObjectId(classId as string) 
        };
        if (academicYearId) filter.academicYearId = new ObjectId(academicYearId as string);

        const diaries = await diaryService.getDiariesPopulated(filter);

        const mappedDiaries = diaries.map(doc => {
             const memberMap = new Map(doc.populatedMembers?.map((m: any) => [m._id.toString(), m]));
             doc.studentTracking = (doc.studentTracking || []).map((t: any) => ({
                 ...t,
                 memberId: memberMap.get(t.memberId.toString()) || t.memberId
             }));
             delete doc.populatedMembers;
             return doc;
        });

        res.status(200).json(mappedDiaries);
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const createDiaryEntry = async (req: Request, res: Response) => {
    try {
        const { entityId, userId } = (req as any).user;
        const { classId, subjectId, academicYearId, type, title, description, dueDate, attachments } = req.body;

        if (!classId || !type || !title || !description) {
            return res.status(400).json(new AppError('Missing required fields', 400));
        }

        let studentTracking: any[] = [];
        const feeGroup = await feeGroupService.getOne({ 
            _id: new ObjectId(classId as string), 
            entityId: new ObjectId(entityId) 
        });

        if (feeGroup) {
            let memberIds: string[] = [];
            if (academicYearId) {
                const roster = feeGroup.yearlyRosters?.find((r: any) => r.academicYearId.toString() === academicYearId);
                if (roster && roster.members) {
                    memberIds = roster.members.map((id: any) => id.toString());
                }
            } else {
                 memberIds = feeGroup.members?.map((id: any) => id.toString()) || [];
            }

            studentTracking = memberIds.map(id => ({
                memberId: new ObjectId(id),
                status: 'pending'
            }));
        }

        const newDiary: any = {
            entityId: new ObjectId(entityId),
            classId: new ObjectId(classId),
            type,
            title,
            description,
            attachments: attachments || [],
            createdBy: new ObjectId(userId),
            studentTracking,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (academicYearId) newDiary.academicYearId = new ObjectId(academicYearId);
        if (subjectId) newDiary.subjectId = new ObjectId(subjectId);
        if (dueDate) newDiary.dueDate = new Date(dueDate);

        const result = await diaryService.insert(newDiary);
        const docs = await diaryService.getDiariesPopulated({ _id: result.insertedId });
        
        let populated = docs[0];
        if (populated && populated.populatedMembers) {
            const memberMap = new Map(populated.populatedMembers.map((m: any) => [m._id.toString(), m]));
            populated.studentTracking = (populated.studentTracking || []).map((t: any) => ({
                ...t,
                memberId: memberMap.get(t.memberId.toString()) || t.memberId
            }));
            delete populated.populatedMembers;
        }

        res.status(201).json(populated);
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const updateTracking = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { entityId } = (req as any).user;
        const { updates } = req.body; 

        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json(new AppError('Updates array required', 400));
        }

        const diary = await diaryService.getOne({ _id: new ObjectId(id), entityId: new ObjectId(entityId) });
        if (!diary) return res.status(404).json(new AppError('Diary entry not found', 404));

        const updatesMap = new Map(updates.map((u: any) => [u.memberId.toString(), u.status]));
        
        diary.studentTracking.forEach((track: any) => {
            const memberIdStr = track.memberId.toString();
            if (updatesMap.has(memberIdStr)) {
                track.status = updatesMap.get(memberIdStr) as any;
            }
        });

        await diaryService.update(
            { _id: new ObjectId(id) },
            { $set: { studentTracking: diary.studentTracking, updatedAt: new Date() }}
        );

        const docs = await diaryService.getDiariesPopulated({ _id: new ObjectId(id) });
        let populated = docs[0];
        if (populated && populated.populatedMembers) {
             const memberMap = new Map(populated.populatedMembers.map((m: any) => [m._id.toString(), m]));
             populated.studentTracking = (populated.studentTracking || []).map((t: any) => ({
                 ...t,
                 memberId: memberMap.get(t.memberId.toString()) || t.memberId
             }));
             delete populated.populatedMembers;
        }

        res.status(200).json(populated);
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const getMemberDiaryFeed = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const memberId = req.params.memberId as string;
        const { academicYearId } = req.query;

        const filter: any = { 
            entityId: new ObjectId(entityId), 
            'studentTracking.memberId': new ObjectId(memberId) 
        };
        if (academicYearId) filter.academicYearId = new ObjectId(academicYearId as string);

        const diaries = await diaryService.getDiariesPopulated(filter);
        res.status(200).json(diaries);
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};
