import { Request, Response } from 'express';
import diaryService from '../services/diary.service';
import feeGroupService from '../services/fee-group.service';
import memberService from '../services/member.service';
import { AppError } from '../utils/AppError';
import { ObjectId } from 'mongodb';

export const getDiaryFeed = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const { classId, academicYearId } = req.query;
        console.log(`📥 [GET /api/diary] entityId=${entityId}, classId=${classId || 'MISSING'}, academicYearId=${academicYearId || 'None'}`);
        if (!classId) return res.status(400).json(new AppError('classId is required in query params (?classId=...)', 400));

        const filter: any = {
            entityId: new ObjectId(entityId),
            classId: new ObjectId(classId as string)
        };
        if (academicYearId) filter.academicYearId = new ObjectId(academicYearId as string);

        const diaries = await diaryService.getDiariesPopulated(filter);
        console.log(`📦 [GET /api/diary] Found ${diaries.length} diary entries for classId=${classId}`);

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
        console.error(`❌ [GET /api/diary Error]`, error);
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const createDiaryEntry = async (req: Request, res: Response) => {
    try {
        const { entityId, userId } = (req as any).user;
        const { classId, subjectId, academicYearId, type, title, description, dueDate, attachments } = req.body;
        console.log(`📝 [POST /api/diary] Creating entry: entityId=${entityId}, classId=${classId}, type=${type}, title="${title}"`);

        if (!classId || !type || !title) {
            console.warn(`⚠️ [POST /api/diary] Missing required fields in body:`, req.body);
            return res.status(400).json(new AppError('Missing required fields: classId, type and title are required', 400));
        }

        let studentTracking: any[] = [];
        const feeGroup = await feeGroupService.getOne({
            _id: new ObjectId(classId as string),
            entityId: new ObjectId(entityId)
        });

        if (feeGroup) {
            let memberIdObjects: ObjectId[] = [];
            if (academicYearId && feeGroup.yearlyRosters) {
                const roster = (feeGroup.yearlyRosters as any[]).find((r: any) => r.academicYearId && r.academicYearId.toString() === academicYearId);
                if (roster && roster.members) {
                    memberIdObjects = (roster.members as any[]).map((mId: any) => new ObjectId(mId.toString()));
                }
            } else if (!academicYearId && feeGroup.members) {
                memberIdObjects = (feeGroup.members as any[]).map((mId: any) => new ObjectId(mId.toString()));
            }

            const memberConditions: any[] = [
                { feeGroupId: new ObjectId(classId as string) }
            ];
            if (memberIdObjects.length > 0) {
                memberConditions.push({ _id: { $in: memberIdObjects } });
            }

            const classMembers = await memberService.get({
                entityId: new ObjectId(entityId),
                status: { $ne: 'checked_out' },
                $or: memberConditions
            });

            studentTracking = classMembers.map((m: any) => ({
                memberId: m._id!,
                status: 'pending'
            }));
        }

        const newDiary: any = {
            entityId: new ObjectId(entityId),
            classId: new ObjectId(classId),
            type,
            title,
            description: description || '',
            attachments: attachments || [],
            createdBy: new ObjectId(userId),
            studentTracking,
            date: req.body.date ? new Date(req.body.date) : new Date(),
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
            { $set: { studentTracking: diary.studentTracking, updatedAt: new Date() } }
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

export const updateDiaryEntry = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { entityId } = (req as any).user;
        const { title, description, type, subjectId, dueDate, attachments } = req.body;

        const diary = await diaryService.getOne({ _id: new ObjectId(id), entityId: new ObjectId(entityId) });
        if (!diary) return res.status(404).json(new AppError('Diary entry not found', 404));

        const updateData: any = {
            updatedAt: new Date()
        };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (type !== undefined) updateData.type = type;
        if (subjectId !== undefined) updateData.subjectId = subjectId ? new ObjectId(subjectId) : null;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (attachments !== undefined) updateData.attachments = attachments;

        await diaryService.update(
            { _id: new ObjectId(id) },
            { $set: updateData }
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

export const deleteDiaryEntry = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { entityId } = (req as any).user;

        const diary = await diaryService.getOne({ _id: new ObjectId(id), entityId: new ObjectId(entityId) });
        if (!diary) return res.status(404).json(new AppError('Diary entry not found', 404));

        await diaryService.delete({ _id: new ObjectId(id), entityId: new ObjectId(entityId) });
        res.status(200).json({ success: true, message: 'Diary entry deleted successfully' });
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

export const broadcastDailyDiary = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const { classId, academicYearId, date } = req.body;
        console.log(`📢 [POST /api/diary/broadcast] Request received: entityId=${entityId}, body=`, JSON.stringify(req.body));

        if (!classId) {
            console.warn(`⚠️ [POST /api/diary/broadcast] classId is missing in request body!`);
            return res.status(400).json(new AppError('classId is required in JSON body', 400));
        }

        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`🔍 [Diary Broadcast] Querying entries between ${startOfDay.toISOString()} and ${endOfDay.toISOString()} for classId=${classId}`);

        const filter: any = {
            entityId: new ObjectId(entityId),
            classId: new ObjectId(classId),
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        };
        if (academicYearId) filter.academicYearId = new ObjectId(academicYearId);

        const entries = await diaryService.getDiariesPopulated(filter);

        if (!entries || entries.length === 0) {
            console.warn(`⚠️ [Diary Broadcast] No diary entries found for classId=${classId} on date=${targetDate.toISOString().slice(0, 10)}. Total matching: 0`);
            return res.status(400).json(new AppError('No diary entries found for today to broadcast. Please add homework/notes first.', 400));
        }

        console.log(`📋 [Diary Broadcast] Found ${entries.length} entry(ies) for broadcast.`);

        const feeGroup = await feeGroupService.getOne({ _id: new ObjectId(classId), entityId: new ObjectId(entityId) });
        const className = feeGroup?.name || 'Class';

        const summaryLines = entries.map((e: any) => {
            const subject = e.subjectId?.name || e.type?.toUpperCase() || 'General';
            return `• ${subject}: ${e.title}`;
        });

        const title = `📚 Daily Diary: ${className} (${entries.length} ${entries.length === 1 ? 'entry' : 'entries'})`;
        const body = summaryLines.slice(0, 4).join('\n') + (summaryLines.length > 4 ? `\n...+${summaryLines.length - 4} more` : '');

        const notificationService = (await import('../services/notification.service')).default;

        console.log(`📡 [Diary Broadcast] Dispatching push notification to parents of class "${className}"...`);
        const dispatchResult = await notificationService.sendToClassParents(
            classId,
            {
                title,
                body,
                data: {
                    type: 'daily_diary',
                    classId,
                    date: targetDate.toISOString()
                }
            },
            entityId,
            academicYearId
        );
        console.log(`📊 [Diary Broadcast] Dispatch result: ${dispatchResult.successCount} sent, ${dispatchResult.failureCount} failed.`);

        const entryIds = entries.map((e: any) => e._id);
        await diaryService.updateMany(
            { _id: { $in: entryIds } as any },
            { $set: { isPublished: true, publishedAt: new Date() } }
        );

        res.status(200).json({
            success: true,
            entriesCount: entries.length,
            message: `Daily diary broadcasted successfully (${entries.length} entries, ${dispatchResult.successCount} parents notified)`
        });
    } catch (error: any) {
        console.error(`❌ [POST /api/diary/broadcast Error]`, error);
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const getDiaryStatusToday = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const { academicYearId, date } = req.query;

        const targetDate = date ? new Date(date as string) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const classes = await feeGroupService.get({ entityId: new ObjectId(entityId) });
        const result = [];

        for (const cls of classes) {
            const filter: any = {
                entityId: new ObjectId(entityId),
                classId: cls._id,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            };
            if (academicYearId) filter.academicYearId = new ObjectId(academicYearId as string);

            const entries = await diaryService.get(filter);
            const isPublished = entries.length > 0 && entries.some((e: any) => e.isPublished === true);

            result.push({
                classId: cls._id,
                className: cls.name,
                entryCount: entries.length,
                isPublished,
                needsBroadcast: entries.length > 0 && !isPublished
            });
        }

        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};



