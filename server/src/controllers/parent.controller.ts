import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import memberService from '../services/member.service';
import feeGroupService from '../services/fee-group.service';
import staffService from '../services/staff.service';
import attendanceService from '../services/attendance.service';
import diaryService from '../services/diary.service';
import examService from '../services/exam.service';
import examResultService from '../services/exam-result.service';
import feePaymentService from '../services/fee-payment.service';
import feeStructureService from '../services/fee-structure.service';
import { getDB } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { HTTP_STATUS } from '../utils/constants';
import { AppError } from '../utils/AppError';

const JWT_SECRET = process.env.JWT_SECRET || 'ems_secure_jwt_key';

/**
 * 1. POST /api/auth/parent-login
 * Authenticates a parent using registered mobile number + 4-digit security PIN.
 * Supports multi-child discovery across classes in the school.
 */
export const parentLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { contactNumber, pin } = req.body;

        if (!contactNumber) {
            throw new AppError('Registered mobile number is required', HTTP_STATUS.BAD_REQUEST);
        }

        const cleanPhone = contactNumber.toString().trim();

        // 1. Search for students associated with this mobile number
        const matchingStudents = await memberService.get({
            $or: [
                { contact: cleanPhone },
                { fatherPhone: cleanPhone },
                { motherPhone: cleanPhone },
                { altContact: cleanPhone },
                { emergencyContactPhone: cleanPhone }
            ],
            status: { $ne: 'checked_out' }
        });

        if (matchingStudents.length === 0) {
            throw new AppError('No student is registered with this mobile number. Please contact the school administration.', HTTP_STATUS.NOT_FOUND);
        }

        const firstStudent = matchingStudents[0]!;
        const defaultPin = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : '1234';

        // 2. PIN Validation
        if (!pin) {
            const isPinSet = matchingStudents.some(s => !!s.parentPin);
            return res.status(HTTP_STATUS.OK).json({
                pinRequired: true,
                isFirstTime: !isPinSet,
                defaultPinHint: !isPinSet ? defaultPin : undefined,
                message: isPinSet ? 'Please enter your 4-Digit Security PIN' : `Welcome! Your default 4-digit PIN is the last 4 digits of your phone: ${defaultPin}`
            });
        }

        const enteredPin = pin.toString().trim();
        const validPin = matchingStudents.find(s => s.parentPin)?.parentPin || defaultPin;

        if (enteredPin !== validPin) {
            throw new AppError('Invalid 4-Digit Security PIN. Please try again or contact school admin.', HTTP_STATUS.UNAUTHORIZED);
        }

        // 3. Collect enriched children list
        const db = getDB();
        const groupIds = matchingStudents.map(s => s.feeGroupId).filter(id => !!id) as ObjectId[];
        const [groups, entity] = await Promise.all([
            groupIds.length > 0 ? feeGroupService.get({ _id: { $in: groupIds } }) : [],
            db.collection('entities').findOne({ _id: new ObjectId(firstStudent.entityId) })
        ]);

        const groupMap = new Map<string, any>();
        groups.forEach((g: any) => groupMap.set(g._id!.toString(), g));

        // Get class teacher details
        const teacherIds = groups.map((g: any) => g.classTeacherId).filter((id: any) => !!id) as ObjectId[];
        const teachers = teacherIds.length > 0 ? await staffService.get({ _id: { $in: teacherIds } }) : [];
        const teacherMap = new Map<string, any>();
        teachers.forEach((t: any) => teacherMap.set(t._id!.toString(), t));

        const children = matchingStudents.map(s => {
            const grp = s.feeGroupId ? groupMap.get(s.feeGroupId.toString()) : null;
            const ct = grp?.classTeacherId ? teacherMap.get(grp.classTeacherId.toString()) : null;

            return {
                memberId: s._id!.toString(),
                firstName: s.firstName,
                lastName: s.lastName,
                fullName: `${s.firstName} ${s.lastName}`.trim(),
                rollNo: s.rollNo || s.knownId || '',
                admissionNo: s.admissionNo || '',
                knownId: s.knownId || '',
                feeGroupId: s.feeGroupId ? s.feeGroupId.toString() : null,
                groupName: grp?.name || 'Assigned Class',
                profilePicUrl: s.profilePicUrl || null,
                classTeacherName: ct?.name || null,
                classTeacherPhone: ct?.contactNumber || null,
                entityId: s.entityId.toString(),
                schoolName: entity?.name || 'School'
            };
        });

        // 4. Issue Parent JWT Token
        const token = jwt.sign(
            {
                userId: firstStudent._id!.toString(),
                entityId: firstStudent.entityId.toString(),
                role: 'parent',
                contactNumber: cleanPhone,
                name: firstStudent.fatherName || firstStudent.motherName || 'Parent',
                childrenIds: children.map(c => c.memberId)
            },
            JWT_SECRET,
            { expiresIn: '90d' }
        );

        res.status(HTTP_STATUS.OK).json({
            token,
            role: 'parent',
            parentPhone: cleanPhone,
            parentName: firstStudent.fatherName || firstStudent.motherName || 'Parent',
            schoolName: entity?.name || 'School',
            entityId: firstStudent.entityId.toString(),
            children
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 2. POST /api/auth/parent-set-pin
 * Allows a parent to update or set their 4-digit security PIN.
 */
export const parentSetPin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { contactNumber, newPin } = req.body;
        const phone = contactNumber || (req.user as any)?.contactNumber;

        if (!phone || !newPin || newPin.toString().trim().length !== 4) {
            throw new AppError('4-Digit Security PIN is required', HTTP_STATUS.BAD_REQUEST);
        }

        const cleanPhone = phone.toString().trim();
        const cleanPin = newPin.toString().trim();

        await memberService.update(
            {
                $or: [
                    { contact: cleanPhone },
                    { fatherPhone: cleanPhone },
                    { motherPhone: cleanPhone },
                    { altContact: cleanPhone }
                ]
            },
            { $set: { parentPin: cleanPin } }
        );

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: '4-Digit Security PIN updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 3. GET /api/parent/student/:memberId/dashboard
 * Aggregates complete child profile, attendance, diary, exams, fee dues, and receipts.
 */
export const getChildDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const memberId = req.params.memberId as string;
        if (!memberId || !ObjectId.isValid(memberId)) {
            throw new AppError('Valid Student ID is required', HTTP_STATUS.BAD_REQUEST);
        }

        const student = await memberService.getOne({ _id: new ObjectId(memberId) });
        if (!student) {
            throw new AppError('Student record not found', HTTP_STATUS.NOT_FOUND);
        }

        const entityId = student.entityId.toString();
        const now = new Date();
        const todayDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const todayStr = now.toISOString().split('T')[0]!;
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
            diaryService.get({
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
            if (!a.date) return false;
            const d = new Date(a.date);
            return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
        });

        let presentDays = 0;
        let absentDays = 0;
        let totalMarkedDays = 0;
        const calendarHistory: { date: string; status: string }[] = [];

        thisMonthRecords.forEach((a: any) => {
            const rec = a.records?.find((r: any) => r.memberId.toString() === memberId);
            if (rec) {
                totalMarkedDays++;
                if (rec.status === 'present') presentDays++;
                else if (rec.status === 'absent') absentDays++;
                calendarHistory.push({ date: a.date, status: rec.status });
            }
        });

        const attendancePercentage = totalMarkedDays > 0 ? Math.round((presentDays / totalMarkedDays) * 100) : 100;

        // Exam results enrichment
        const examResultsEnriched = allResults.map((r: any) => {
            const ex = recentExams.find((e: any) => e._id!.toString() === r.examId.toString());
            const totalScore = r.marks?.reduce((s: number, m: any) => s + (m.score || 0), 0) || 0;
            const totalMax = r.marks?.reduce((s: number, m: any) => s + (m.maxScore || 100), 0) || 0;
            const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

            return {
                examId: r.examId.toString(),
                examName: ex?.name || 'Examination',
                subjectScores: r.marks?.map((m: any) => ({
                    subject: m.subjectName,
                    marks: m.score,
                    maxMarks: m.maxScore
                })) || [],
                totalMarks: totalScore,
                maxMarks: totalMax,
                percentage,
                grade: percentage >= 90 ? 'A+' : percentage >= 75 ? 'A' : percentage >= 60 ? 'B' : percentage >= 45 ? 'C' : percentage >= 33 ? 'D' : 'F',
                remarks: r.remarks || null
            };
        });

        // Fee Summary calculation
        const totalPaid = feePayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
        const primaryPlan = feeStructures.find((s: any) => s._id!.toString() === student.feeStructureId?.toString()) || feeStructures[0];
        const planAmount = primaryPlan?.amount || 0;
        const pendingAmount = Math.max(0, planAmount - totalPaid);

        res.status(HTTP_STATUS.OK).json({
            student: {
                _id: student._id!.toString(),
                name: `${student.firstName} ${student.lastName}`.trim(),
                rollNo: student.rollNo || student.knownId || '',
                admissionNo: student.admissionNo || '',
                knownId: student.knownId || '',
                className: group?.name || 'Class',
                dob: student.dob || null,
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
                    totalDays: totalMarkedDays,
                    percentage: attendancePercentage,
                    calendar: calendarHistory
                }
            },
            diary: todayDiary.map((d: any) => ({
                _id: d._id!.toString(),
                subjectName: d.subjectName,
                content: d.content,
                assignedDate: d.date,
                authorName: d.authorName || 'Class Teacher'
            })),
            exams: {
                upcoming: recentExams.filter((e: any) => e.startDate >= todayStr).map((e: any) => ({
                    _id: e._id!.toString(),
                    name: e.name,
                    startDate: e.startDate,
                    endDate: e.endDate,
                    subjects: e.subjects
                })),
                results: examResultsEnriched
            },
            fees: {
                planName: primaryPlan?.name || 'Annual School Tuition',
                totalPlanAmount: planAmount,
                totalPaid,
                pendingDues: pendingAmount,
                nextPaymentDate: null,
                payments: feePayments.map((p: any) => ({
                    _id: p._id!.toString(),
                    receiptNo: p.receiptNo || `REC-${p._id!.toString().slice(-6).toUpperCase()}`,
                    amount: p.amount,
                    paymentDate: p.paymentDate,
                    paymentMethod: p.paymentMethod || 'cash',
                    notes: p.notes || null
                }))
            },
            notices: [
                {
                    id: '1',
                    title: 'Welcome to the Academic Session 2026–27',
                    category: 'Academic',
                    date: todayStr,
                    content: 'Dear Parents, Welcome to the new academic year. Please check your child\'s daily homework and attendance regularly.'
                }
            ]
        });
    } catch (error) {
        next(error);
    }
};
