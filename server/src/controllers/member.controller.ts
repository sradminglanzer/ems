import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import memberService from '../services/member.service';
import { Member } from '../models/member.model';
import { User } from '../models/user.model';
import { FeePayment } from '../models/fee-payment.model';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';
import { ObjectId } from 'mongodb';

import feeGroupService from '../services/fee-group.service';
import feeStructureService from '../services/fee-structure.service';
import feePaymentService from '../services/fee-payment.service';
import userService from '../services/user.service';
import staffService from '../services/staff.service';
import attendanceService from '../services/attendance.service';
import diaryService from '../services/diary.service';
import examService from '../services/exam.service';
import examResultService from '../services/exam-result.service';
import { getDB } from '../config/db';

export const getMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();

        let members = await memberService.getByEntity(entityId);
        console.log('members', members);
        if (req.user!.role === 'parent') {
            const parentPhone = req.user!.userId.replace('parent_', '');
            members = members.filter(m =>
                m.contact === parentPhone ||
                m.fatherPhone === parentPhone ||
                m.motherPhone === parentPhone ||
                m.altContact === parentPhone ||
                m.emergencyContactPhone === parentPhone
            );
        }

        const [feeGroups, feeStructures, feePayments] = await Promise.all([
            feeGroupService.getByEntity(entityId),
            feeStructureService.getByEntity(entityId),
            feePaymentService.getByEntity(entityId)
        ]);

        const academicYearIdStr = req.query.academicYearId as string;

        // Calculate total structural fees per group
        const groupTotalFees: Record<string, number> = {};
        feeGroups.forEach(g => {
            const groupStructures = feeStructures.filter(s => s.feeGroupId && s.feeGroupId.toString() === g._id!.toString());
            const totalFee = groupStructures.reduce((sum, s) => sum + s.amount, 0);
            groupTotalFees[g._id!.toString()] = totalFee;
        });

        // Enrich members with group and fee stats
        const memberStats = members.map(m => {
            const mId = m._id!.toString();

            // find group based on direct feeGroupId or roster
            let group;
            if (m.feeGroupId) {
                group = feeGroups.find(g => g._id!.toString() === m.feeGroupId!.toString());
            }
            if (!group && academicYearIdStr) {
                group = feeGroups.find(g => {
                    const roster = g.yearlyRosters?.find((r: any) => r.academicYearId.toString() === academicYearIdStr);
                    return roster && roster.members && roster.members.some((id: any) => id.toString() === mId);
                });
            } else if (!group) {
                group = feeGroups.find(g => {
                    return (g.members && g.members.some((id: any) => id.toString() === mId)) ||
                        (g.yearlyRosters?.some((r: any) => r.members && r.members.some((id: any) => id.toString() === mId)));
                });
            }

            let totalFee = 0;
            let groupName = 'Unassigned';

            if (group) {
                totalFee = groupTotalFees[group._id!.toString()] || 0;
                groupName = group.name;
            }

            let addonNames: string[] = [];
            if (m.addonFeeIds && m.addonFeeIds.length > 0) {
                const addons = feeStructures.filter(s => m.addonFeeIds!.some((id: any) => id.toString() === s._id!.toString()));
                totalFee += addons.reduce((sum, s) => sum + s.amount, 0);
                addonNames = addons.map(s => s.name);
            }

            // find payments
            const memberPayments = feePayments.filter(p => p.memberId.toString() === mId);
            const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount, 0);

            // get active latest nextPaymentDate
            const paymentsWithNextDate = memberPayments
                .filter(p => p.nextPaymentDate)
                .sort((a, b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
            const nextPaymentDate = paymentsWithNextDate[0]?.nextPaymentDate || null;

            return {
                ...m,
                groupName,
                addonNames,
                totalFee,
                totalPaid,
                pendingAmount: totalFee - totalPaid,
                nextPaymentDate
            };
        });

        res.status(HTTP_STATUS.OK).json(memberStats);
    } catch (error) {
        next(error);
    }
};

export const getMemberById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const id = req.params.id;
        const academicYearIdStr = req.query.academicYearId as string;

        const m = await memberService.getOne({ _id: new ObjectId(id as string), entityId: new ObjectId(entityId) });
        if (!m) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Member not found' });
        }

        const [feeGroups, feeStructures, feePayments] = await Promise.all([
            feeGroupService.getByEntity(entityId),
            feeStructureService.getByEntity(entityId),
            feePaymentService.getByEntity(entityId)
        ]);

        const groupTotalFees: Record<string, number> = {};
        feeGroups.forEach(g => {
            const groupStructures = feeStructures.filter(s => s.feeGroupId && s.feeGroupId.toString() === g._id!.toString());
            const totalFee = groupStructures.reduce((sum, s) => sum + s.amount, 0);
            groupTotalFees[g._id!.toString()] = totalFee;
        });

        const mId = m._id!.toString();
        let group;
        if (academicYearIdStr) {
            group = feeGroups.find(g => {
                const roster = g.yearlyRosters?.find((r: any) => r.academicYearId.toString() === academicYearIdStr);
                return roster && roster.members && roster.members.some((id: any) => id.toString() === mId);
            });
        } else {
            group = feeGroups.find(g => {
                return (g.members && g.members.some((id: any) => id.toString() === mId)) ||
                    (g.yearlyRosters?.some((r: any) => r.members && r.members.some((id: any) => id.toString() === mId)));
            });
        }

        let totalFee = 0;
        let groupName = 'Unassigned';

        if (group) {
            totalFee = groupTotalFees[group._id!.toString()] || 0;
            groupName = group.name;
        }

        let addonNames: string[] = [];
        if (m.addonFeeIds && m.addonFeeIds.length > 0) {
            const addons = feeStructures.filter(s => m.addonFeeIds!.some((id: any) => id.toString() === s._id!.toString()));
            totalFee += addons.reduce((sum, s) => sum + s.amount, 0);
            addonNames = addons.map(s => s.name);
        }

        const memberPayments = feePayments.filter(p => p.memberId.toString() === mId);
        const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount, 0);

        const memberStats = {
            ...m,
            groupName,
            addonNames,
            totalFee,
            totalPaid,
            pendingAmount: totalFee - totalPaid
        };

        res.status(HTTP_STATUS.OK).json(memberStats);
    } catch (error) {
        next(error);
    }
};

export const createMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityIdObj = new ObjectId(req.user!.entityId as string);
        const member = new Member({ ...req.body, entityId: req.user!.entityId });

        if (!member.valid) {
            throw new AppError('Invalid member data. First Name, Last Name and Known ID are required.', HTTP_STATUS.BAD_REQUEST);
        }

        // Room capacity check for PG/Hostel
        if (req.body.feeGroupId) {
            const groupId = new ObjectId(req.body.feeGroupId as string);
            const [group, entityDoc, roomActiveMembers] = await Promise.all([
                feeGroupService.getOne({ _id: groupId, entityId: entityIdObj }),
                getDB().collection('entities').findOne({ _id: entityIdObj }),
                memberService.get({ entityId: entityIdObj, feeGroupId: groupId, status: 'active' } as any)
            ]);

            if (group && (entityDoc?.type === 'pg' || entityDoc?.type === 'hostel')) {
                const capacity = group.capacity || 1;
                if (roomActiveMembers.length >= capacity) {
                    throw new AppError(`Room ${group.name} is fully occupied (${capacity}/${capacity} beds taken)`, HTTP_STATUS.BAD_REQUEST);
                }
            }
        }

        const result = await memberService.insert(member);

        // Auto-assign to fee group if requested inline
        if (req.body.feeGroupId) {
            try {
                const groupId = new ObjectId(req.body.feeGroupId as string);
                const memberIdObj = new ObjectId(result.insertedId.toString());

                // Fetch group
                const group = await feeGroupService.getOne({ _id: groupId, entityId: entityIdObj });

                if (group) {
                    if (req.body.academicYearId) {
                        // School: store in yearlyRosters
                        const yearId = new ObjectId(req.body.academicYearId as string);
                        let rosters = group.yearlyRosters || [];
                        const rosterIdx = rosters.findIndex((r: any) => r.academicYearId.toString() === yearId.toString());

                        if (rosterIdx > -1) {
                            let currentMembers: any[] = (rosters[rosterIdx] as any).members || [];
                            const exists = currentMembers.some((m: any) => m.toString() === memberIdObj.toString());
                            if (!exists) {
                                currentMembers.push(memberIdObj);
                            }
                            (rosters[rosterIdx] as any).members = currentMembers;
                        } else {
                            rosters.push({
                                academicYearId: yearId,
                                members: [memberIdObj]
                            });
                        }

                        await feeGroupService.update(
                            { _id: groupId, entityId: new ObjectId(req.user!.entityId) },
                            { $set: { yearlyRosters: rosters } }
                        );
                        // Also store feeGroupId on the member for fast lookup
                        await memberService.update(
                            { _id: memberIdObj },
                            { $set: { feeGroupId: groupId } }
                        );
                    } else {
                        // Gym: store in feeGroup.members[] AND on member.feeGroupId
                        let directMembers = group.members || [];
                        const exists = directMembers.some((m: any) => m.toString() === memberIdObj.toString());
                        if (!exists) {
                            directMembers.push(memberIdObj);
                            await feeGroupService.update(
                                { _id: groupId, entityId: new ObjectId(req.user!.entityId) },
                                { $set: { members: directMembers } }
                            );
                        }
                        // Always write feeGroupId back to the member for fast lookup
                        await memberService.update(
                            { _id: memberIdObj },
                            { $set: { feeGroupId: groupId } }
                        );
                    }
                }
            } catch (e: any) {
                console.error('Error auto-enrolling into fee group during member creation:', e);
            }
        }

        let generatedReceiptNo;
        // POS Onboarding: Inject Fee Payment
        if (req.body.initialPayment) {
            try {
                const { amount, paymentMethod, nextPaymentDateStr, paymentDateStr, referenceDocumentUrl } = req.body.initialPayment;
                const payment = new FeePayment({
                    entityId: new ObjectId(req.user!.entityId),
                    memberId: new ObjectId(result.insertedId.toString()),
                    amount: amount,
                    paymentMethod: paymentMethod || 'cash',
                    referenceDocumentUrl: referenceDocumentUrl,
                    paymentDate: paymentDateStr ? new Date(paymentDateStr) : new Date(),
                    nextPaymentDate: nextPaymentDateStr ? new Date(nextPaymentDateStr) : undefined,
                    notes: 'POS Initial Onboarding Payment'
                });
                console.log('payment ', payment, payment.valid)
                if (payment.valid) {
                    payment.receiptNo = await feePaymentService.getNextSequence(req.user!.entityId);
                    generatedReceiptNo = payment.receiptNo;
                    await feePaymentService.insert(payment);
                } else {
                    console.error('Initial payment payload invalid:', payment);
                }
            } catch (e: any) {
                console.error('Error recording POS initial payment:', e);
            }
        }

        res.status(HTTP_STATUS.CREATED).json({ insertedId: result.insertedId, receiptNo: generatedReceiptNo });
    } catch (error) {
        next(error);
    }
};

export const updateMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        if (req.body.entityId) delete req.body.entityId;

        // Validation for partial update
        const allowedFields = [
            'firstName', 'middleName', 'lastName', 'knownId', 'admissionNo', 'rollNo',
            'apaarId', 'aadhaarNo', 'dob', 'gender', 'placeOfBirth', 'nationality',
            'motherTongue', 'religion', 'casteCategory', 'subCaste', 'bloodGroup',
            'medicalNotes', 'identificationMarks', 'contact', 'altContact', 'email',
            'fatherName', 'fatherAadhaar', 'fatherQualification', 'fatherOccupation',
            'fatherIncome', 'fatherPhone', 'fatherEmail',
            'motherName', 'motherAadhaar', 'motherQualification', 'motherOccupation',
            'motherIncome', 'motherPhone', 'motherEmail',
            'guardianName', 'guardianRelation', 'guardianPhone', 'guardianAddress',
            'address', 'presentAddress', 'permanentAddress', 'city', 'district', 'state', 'pincode',
            'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
            'previousSchoolName', 'previousBoard', 'previousClassPassed', 'tcNumber', 'tcDate', 'previousPercentage',
            'concessionType', 'concessionValue', 'concessionReason',
            'feeGroupId', 'feeStructureId', 'addonFeeIds', 'profilePicUrl', 'academicYearId', 'status', 'documents'
        ];
        let updateData: any = { $set: {} };
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'feeGroupId' || field === 'feeStructureId' || field === 'academicYearId') {
                    updateData.$set[field] = req.body[field] ? new ObjectId(req.body[field] as string) : null;
                } else if (field === 'addonFeeIds' && Array.isArray(req.body[field])) {
                    updateData.$set[field] = req.body[field].map((id: any) => new ObjectId(id));
                } else {
                    updateData.$set[field] = req.body[field];
                }
            }
        });

        if (Object.keys(updateData.$set).length === 0) {
            delete updateData.$set;
        }

        const result = await memberService.update(
            { _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId) },
            updateData
        );

        res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const updateMemberFeeDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const { feeGroupId, feeStructureId, addonFeeIds } = req.body;

        let updateData: any = { $set: {} };

        if (feeGroupId !== undefined) {
            updateData.$set.feeGroupId = feeGroupId ? new ObjectId(feeGroupId as string) : null;
        }
        if (feeStructureId !== undefined) {
            updateData.$set.feeStructureId = feeStructureId ? new ObjectId(feeStructureId as string) : null;
        }
        if (addonFeeIds !== undefined && Array.isArray(addonFeeIds)) {
            updateData.$set.addonFeeIds = addonFeeIds.map((aid: any) => new ObjectId(aid));
        }

        if (Object.keys(updateData.$set).length > 0) {
            await memberService.update(
                { _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId) },
                updateData
            );
        }

        res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const deleteMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const result = await memberService.delete({ _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId) });

        if (result) {
            res.status(HTTP_STATUS.OK).json({ message: 'Member deleted' });
        } else {
            res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Member not found' });
        }
    } catch (error) {
        next(error);
    }
};
export const holdMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const entityId = String(req.user!.entityId);

        const member = await memberService.getOne({ _id: new ObjectId(id), entityId: new ObjectId(entityId) });
        if (!member) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Member not found' });
        }
        if (member.status === 'on_hold') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Member is already on hold' });
        }

        await memberService.update(
            { _id: new ObjectId(id), entityId: new ObjectId(entityId) },
            { $set: { status: 'on_hold', holdStartDate: new Date(), updatedAt: new Date() } }
        );

        res.status(HTTP_STATUS.OK).json({ success: true, message: 'Member placed on hold' });
    } catch (error) {
        next(error);
    }
};

export const resumeMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const entityId = String(req.user!.entityId);

        const member = await memberService.getOne({ _id: new ObjectId(id), entityId: new ObjectId(entityId) });
        if (!member) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Member not found' });
        }
        if (member.status !== 'on_hold') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Member is not on hold' });
        }

        // Build updated hold history
        const holdEntry = {
            holdDate: member.holdStartDate || new Date(),
            resumeDate: new Date()
        };
        const existingHistory = member.holdHistory || [];
        const updatedHistory = [...existingHistory, holdEntry];

        await memberService.update(
            { _id: new ObjectId(id), entityId: new ObjectId(entityId) },
            {
                $set: {
                    status: 'active',
                    holdHistory: updatedHistory,
                    updatedAt: new Date()
                },
                $unset: { holdStartDate: '' }
            }
        );

        // Optional: record re-join payment in same call
        let generatedReceiptNo;
        if (req.body.initialPayment) {
            try {
                const { amount, paymentMethod, nextPaymentDateStr, referenceDocumentUrl } = req.body.initialPayment;
                const payment = new FeePayment({
                    entityId: new ObjectId(entityId),
                    memberId: new ObjectId(id),
                    amount,
                    paymentMethod: paymentMethod || 'cash',
                    referenceDocumentUrl,
                    paymentDate: new Date(),
                    nextPaymentDate: nextPaymentDateStr ? new Date(nextPaymentDateStr) : undefined,
                    notes: 'Re-join Payment after Hold'
                });
                if (payment.valid) {
                    payment.receiptNo = await feePaymentService.getNextSequence(entityId);
                    generatedReceiptNo = payment.receiptNo;
                    await feePaymentService.insert(payment);
                }
            } catch (e) {
                console.error('Error recording re-join payment:', e);
            }
        }

        res.status(HTTP_STATUS.OK).json({ success: true, message: 'Member resumed', receiptNo: generatedReceiptNo });
    } catch (error) {
        next(error);
    }
};

export const checkoutMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const id = req.params.id as string;
        const member = await memberService.getOne({ _id: new ObjectId(id), entityId: new ObjectId(entityId) });
        if (!member) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Member not found' });
        }

        const {
            checkoutDate,
            depositAmount,
            pendingDues,
            deductions,
            deductionReason,
            netRefunded,
            refundMethod,
            notes
        } = req.body;

        const checkoutDetails = {
            checkoutDate: checkoutDate ? new Date(checkoutDate) : new Date(),
            depositAmount: Number(depositAmount) || 0,
            pendingDues: Number(pendingDues) || 0,
            deductions: Number(deductions) || 0,
            deductionReason: deductionReason || '',
            netRefunded: Number(netRefunded) || 0,
            refundMethod: refundMethod || 'cash',
            notes: notes || ''
        };

        await memberService.update(
            { _id: new ObjectId(id), entityId: new ObjectId(entityId) },
            {
                $set: {
                    status: 'checked_out',
                    checkoutDetails,
                    updatedAt: new Date()
                }
            }
        );

        res.status(HTTP_STATUS.OK).json({ success: true, message: 'Member checked out successfully', checkoutDetails });
    } catch (error) {
        next(error);
    }
};

export const getStudentDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const memberId = req.params.id as string;
        if (!memberId || memberId.length !== 24) {
            throw new AppError('Valid Member ID is required', HTTP_STATUS.BAD_REQUEST);
        }

        const student = await memberService.getOne({ _id: new ObjectId(memberId) });
        if (!student) {
            throw new AppError('Student record not found', HTTP_STATUS.NOT_FOUND);
        }

        const entityId = student.entityId.toString();
        const now = new Date();
        const todayDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const db = getDB();

        // Run parallel data fetches
        const [
            entity,
            group,
            todayAttendance,
            monthlyAttendanceList,
            todayDiary,
            recentExams,
            allResults,
            feePayments,
            feeStructures
        ] = await Promise.all([
            db.collection('entities').findOne({ _id: new ObjectId(entityId) }),
            student.feeGroupId ? feeGroupService.getOne({ _id: new ObjectId(student.feeGroupId) }) : null,
            attendanceService.getOne({
                entityId: new ObjectId(entityId),
                date: todayDate,
                'records.memberId': new ObjectId(memberId)
            }),
            attendanceService.get({
                entityId: new ObjectId(entityId),
                'records.memberId': new ObjectId(memberId)
            }),
            diaryService.getDiariesPopulated({
                entityId: new ObjectId(entityId),
                ...(student.feeGroupId && { classId: new ObjectId(student.feeGroupId) })
            }),
            examService.getByEntity(entityId, student.academicYearId?.toString()),
            examResultService.getByMember(memberId),
            feePaymentService.getByMember(memberId, entityId, student.academicYearId?.toString()),
            feeStructureService.getByEntity(entityId, student.academicYearId?.toString())
        ]);

        // Class teacher lookup
        let classTeacherName: string | null = null;
        let classTeacherPhone: string | null = null;
        if (group?.classTeacherId) {
            const ct = await staffService.getOne({ _id: new ObjectId(group.classTeacherId) });
            classTeacherName = ct?.name || null;
            classTeacherPhone = ct?.contactNumber || null;
        }

        // Today's attendance status
        let todayStatus = 'not_marked';
        if (todayAttendance) {
            const rec = (todayAttendance as any).records?.find((r: any) => r.memberId.toString() === memberId);
            if (rec) todayStatus = rec.status;
        }

        // Monthly attendance calculation
        const thisMonthRecords = monthlyAttendanceList.filter((a: any) => {
            const ad = new Date(a.date);
            return ad.getMonth() + 1 === currentMonth && ad.getFullYear() === currentYear;
        });

        let presentDays = 0;
        let absentDays = 0;
        const calendar: Array<{ date: string; status: string }> = [];

        thisMonthRecords.forEach((a: any) => {
            const rec = a.records?.find((r: any) => r.memberId.toString() === memberId);
            const status = rec?.status || 'not_marked';
            const dateStr = new Date(a.date).toISOString().split('T')[0]!;
            calendar.push({ date: dateStr, status });
            if (status === 'present') presentDays++;
            else if (status === 'absent') absentDays++;
        });

        const totalMarkedDays = presentDays + absentDays;
        const attendancePercentage = totalMarkedDays > 0 ? Math.round((presentDays / totalMarkedDays) * 100) : 100;

        // Diary items formatting
        const diaryItems = (todayDiary || []).map((d: any) => ({
            _id: d._id?.toString() || '',
            subjectName: d.subjectId?.name || d.subjectName || 'General',
            title: d.title || d.topic || '',
            topic: d.title || d.topic || '',
            content: d.description || d.content || d.title || '',
            attachments: Array.isArray(d.attachments) ? d.attachments : [],
            imageUrl: Array.isArray(d.attachments) && d.attachments.length > 0 ? d.attachments[0] : (d.imageUrl || null),
            assignedDate: d.date ? new Date(d.date).toISOString().split('T')[0] : (d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : ''),
            authorName: d.createdBy?.name || 'Class Teacher'
        }));

        // Exam results formatting
        const results = (allResults || []).map((r: any) => {
            const ex = (recentExams || []).find((e: any) => e._id?.toString() === r.examId?.toString());
            return {
                examId: r.examId?.toString() || '',
                examName: ex?.name || 'Term Exam',
                subjectScores: (r.subjectScores || []).map((s: any) => ({
                    subject: s.subject || 'Subject',
                    marks: Number(s.marks) || 0,
                    maxMarks: Number(s.maxMarks) || 100
                })),
                totalMarks: Number(r.totalMarks) || 0,
                maxMarks: Number(r.maxMarks) || 100,
                percentage: Number(r.percentage) || 0,
                grade: r.grade || 'A',
                remarks: r.remarks || null
            };
        });

        const upcomingExams = (recentExams || []).slice(0, 5).map((e: any) => ({
            _id: e._id?.toString() || '',
            name: e.name || '',
            startDate: e.startDate || '',
            endDate: e.endDate || '',
            feeGroupId: e.feeGroupId?.toString() || null,
            feeGroupName: group?.name || '',
            subjects: e.subjects || []
        }));

        // Fee calculations
        const totalPlanAmount = (feeStructures || []).reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
        const totalPaid = (feePayments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const pendingDues = Math.max(0, totalPlanAmount - totalPaid);

        const payments = (feePayments || []).map((p: any) => ({
            _id: p._id?.toString() || '',
            receiptNo: p.receiptNo || 'REC-' + (p._id?.toString() || '').slice(-4).toUpperCase(),
            amount: Number(p.amount) || 0,
            paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : '',
            paymentMethod: p.paymentMethod || 'cash',
            notes: p.notes || null
        }));

        // Dynamic Notices & Announcements Query
        let notices: any[] = [];
        try {
            const db = getDB();
            if (db) {
                const noticeDocs = await db.collection('notices')
                    .find({ entityId: student.entityId, status: { $ne: 'archived' } })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .toArray();

                if (noticeDocs.length > 0) {
                    notices = noticeDocs.map((n: any) => ({
                        id: n._id?.toString() || '',
                        title: n.title || 'Announcement',
                        category: n.category || 'General',
                        date: n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
                        content: n.content || ''
                    }));
                } else {
                    // Check diary for announcements / reminders for this class or school
                    const diaryAnnouncements = await db.collection('diary')
                        .find({
                            entityId: student.entityId,
                            type: { $in: ['announcement', 'reminder'] }
                        })
                        .sort({ date: -1 })
                        .limit(5)
                        .toArray();

                    if (diaryAnnouncements.length > 0) {
                        notices = diaryAnnouncements.map((d: any) => ({
                            id: d._id?.toString() || '',
                            title: d.title || (d.type === 'reminder' ? 'Important Reminder' : 'School Announcement'),
                            category: d.type === 'reminder' ? 'Reminder' : 'Academic',
                            date: d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
                            content: d.content || d.description || ''
                        }));
                    }
                }
            }
        } catch (_e) { /* ignore */ }

        return res.status(HTTP_STATUS.OK).json({
            student: {
                _id: student._id?.toString() || '',
                name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student',
                rollNo: student.rollNo || '',
                admissionNo: student.admissionNo || '',
                knownId: student.knownId || '',
                className: group?.name || '',
                dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : null,
                bloodGroup: student.bloodGroup || null,
                fatherName: student.fatherName || null,
                motherName: student.motherName || null,
                classTeacherName,
                classTeacherPhone,
                profilePicUrl: student.profilePicUrl || null
            },
            schoolName: entity?.name || 'School',
            attendance: {
                todayStatus,
                thisMonth: {
                    month: currentMonth,
                    year: currentYear,
                    presentDays,
                    absentDays,
                    totalDays: calendar.length,
                    percentage: attendancePercentage,
                    calendar
                }
            },
            diary: diaryItems,
            exams: {
                upcoming: upcomingExams,
                results
            },
            fees: {
                planName: group?.name ? `${group.name} Annual Fee` : 'Annual Fee Plan',
                totalPlanAmount,
                totalPaid,
                pendingDues,
                nextPaymentDate: null,
                payments
            },
            notices
        });
    } catch (error) {
        next(error);
    }
};
