import { Request, Response } from 'express';
import attendanceService from '../services/attendance.service';
import memberService from '../services/member.service';
import feeGroupService from '../services/fee-group.service';
import { AppError } from '../utils/AppError';
import { ObjectId } from 'mongodb';

// Normalize date to start of day UTC
const normalizeDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

export const getAttendance = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const { classId, date, academicYearId } = req.query;

        if (!classId || !date) {
            return res.status(400).json(new AppError('classId and date are required', 400));
        }

        const normalizedDate = normalizeDate(date as string);

        let attendance = await attendanceService.getAttendanceWithMembers({
            entityId: new ObjectId(entityId),
            classId: new ObjectId(classId as string),
            date: normalizedDate
        });

        // If attendance hasn't been marked yet for this day, generate a template
        if (!attendance) {
            const feeGroup = await feeGroupService.getOne({ 
                _id: new ObjectId(classId as string), 
                entityId: new ObjectId(entityId) 
            });
            
            if (!feeGroup) {
                return res.status(404).json(new AppError('Class not found', 404));
            }

            let memberIds: string[] = [];
            if (academicYearId) {
                const roster = feeGroup.yearlyRosters?.find((r: any) => r.academicYearId.toString() === academicYearId);
                if (roster && roster.members) {
                    memberIds = roster.members.map((id: any) => id.toString());
                }
            } else {
                 memberIds = feeGroup.members?.map((id: any) => id.toString()) || [];
            }

            if (memberIds.length === 0) {
                 return res.status(200).json({ isNew: true, records: [] });
            }

            const allMembers = await memberService.getByEntity(entityId);
            const classMembers = allMembers.filter(m => memberIds.includes(m._id!.toString()));

            const defaultRecords = classMembers.map(m => ({
                memberId: m, 
                status: 'present',
                remarks: ''
            }));

            return res.status(200).json({
                isNew: true,
                entityId,
                classId,
                date: normalizedDate,
                records: defaultRecords
            });
        }

        res.status(200).json({ isNew: false, ...attendance });
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const saveAttendance = async (req: Request, res: Response) => {
    try {
        const { entityId, userId } = (req as any).user;
        const { classId, date, academicYearId, records } = req.body;

        if (!classId || !date || !records) {
            return res.status(400).json(new AppError('classId, date, and records are required', 400));
        }

        const normalizedDate = normalizeDate(date as string);
        
        const updateData: any = {
            recordedBy: new ObjectId(userId),
            records: records.map((r: any) => ({
                ...r,
                memberId: new ObjectId(r.memberId)
            })),
            updatedAt: new Date()
        };

        if (academicYearId) updateData.academicYearId = new ObjectId(academicYearId);

        const existing = await attendanceService.getOne({
            entityId: new ObjectId(entityId),
            classId: new ObjectId(classId),
            date: normalizedDate
        });

        if (existing) {
             await attendanceService.update({ _id: existing._id }, { $set: updateData });
        } else {
             await attendanceService.insert({
                 entityId: new ObjectId(entityId),
                 classId: new ObjectId(classId),
                 date: normalizedDate,
                 ...updateData,
                 createdAt: new Date()
             });
        }

        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};

export const getMemberAttendance = async (req: Request, res: Response) => {
    try {
        const { entityId } = (req as any).user;
        const memberId = req.params.memberId as string;
        const { academicYearId } = req.query;

        const filter: any = { 
            entityId: new ObjectId(entityId), 
            'records.memberId': new ObjectId(memberId) 
        };
        
        if (academicYearId) {
            filter.academicYearId = new ObjectId(academicYearId as string);
        }

        const attendances = await attendanceService.get(filter, { sort: { date: -1 } });

        const memberHistory = attendances.map(att => {
            const record = att.records.find((r: any) => r.memberId.toString() === memberId);
            return {
                date: att.date,
                status: record?.status || 'unknown',
                remarks: record?.remarks || ''
            };
        });

        res.status(200).json(memberHistory);
    } catch (error: any) {
        res.status(500).json(new AppError(error.message, 500));
    }
};
