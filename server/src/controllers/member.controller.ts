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
import entitySettingsService from '../services/entity-settings.service';
import { getDB } from '../config/db';

export const getNextAdmissionNo = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const settings = await entitySettingsService.getByEntity(entityId);
        const config = settings.admissionConfig || {
            prefix: 'ADM-',
            includeYear: true,
            startingNumber: 1,
            paddingDigits: 4,
            autoGenerate: true
        };

        const currentYear = new Date().getFullYear();
        const yearPrefix = config.includeYear ? `${currentYear}-` : '';
        const basePrefix = `${config.prefix || 'ADM-'}${yearPrefix}`;

        // Get all members for this entity
        const members = await getDB().collection('members').find(
            { entityId: new ObjectId(entityId) },
            { projection: { admissionNo: 1, knownId: 1 } }
        ).toArray();

        let maxSeq = Math.max(0, (config.startingNumber || 1) - 1);

        members.forEach((m: any) => {
            const no = (m.admissionNo || m.knownId || '').trim();
            if (no) {
                const match = no.match(/(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxSeq) {
                        maxSeq = num;
                    }
                }
            }
        });

        const nextSeq = maxSeq + 1;
        const padding = config.paddingDigits || 4;
        const nextAdmissionNo = `${basePrefix}${String(nextSeq).padStart(padding, '0')}`;

        res.status(HTTP_STATUS.OK).json({
            nextAdmissionNo,
            prefix: config.prefix,
            includeYear: config.includeYear,
            startingNumber: config.startingNumber,
            paddingDigits: config.paddingDigits,
            totalMembers: members.length
        });
    } catch (error) {
        next(error);
    }
};

export const getNextRollNo = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const feeGroupId = req.query.feeGroupId as string;
        const academicYearId = req.query.academicYearId as string;

        if (!feeGroupId) {
            return res.status(HTTP_STATUS.OK).json({
                nextRollNo: '1',
                totalInClass: 0
            });
        }

        const entityIdObj = new ObjectId(entityId);
        const groupIdObj = new ObjectId(feeGroupId);

        // Find group to check members / rosters
        const group = await feeGroupService.getOne({ _id: groupIdObj, entityId: entityIdObj });
        let memberIdsInClass: ObjectId[] = [];

        if (group) {
            if (academicYearId && group.yearlyRosters) {
                const roster = group.yearlyRosters.find((r: any) => r.academicYearId && r.academicYearId.toString() === academicYearId);
                if (roster && Array.isArray(roster.members)) {
                    memberIdsInClass = roster.members.map((id: any) => typeof id === 'string' ? new ObjectId(id) : id);
                }
            } else if (Array.isArray(group.members)) {
                memberIdsInClass = group.members.map((id: any) => typeof id === 'string' ? new ObjectId(id) : id);
            }
        }

        // Also query members where feeGroupId matches directly
        const conditions: any = {
            entityId: entityIdObj,
            $or: [
                { feeGroupId: groupIdObj }
            ]
        };
        if (memberIdsInClass.length > 0) {
            conditions.$or.push({ _id: { $in: memberIdsInClass } });
        }

        const classMembers = await getDB().collection('members').find(
            conditions,
            { projection: { rollNo: 1, firstName: 1, lastName: 1 } }
        ).toArray();

        let maxRoll = 0;
        classMembers.forEach((m: any) => {
            const r = (m.rollNo || '').trim();
            if (r) {
                const match = r.match(/(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxRoll) {
                        maxRoll = num;
                    }
                }
            }
        });

        const nextRollNo = (maxRoll + 1).toString();

        res.status(HTTP_STATUS.OK).json({
            nextRollNo,
            totalInClass: classMembers.length
        });
    } catch (error) {
        next(error);
    }
};

export const getMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const parentPhone = req.user!.role === 'parent'
            ? req.user!.userId.replace('parent_', '')
            : undefined;
        const academicYearId = req.query.academicYearId as string | undefined;

        const members = await memberService.getMembersWithDetails(entityId, {
            parentPhone,
            academicYearId
        });

        res.status(HTTP_STATUS.OK).json(members);
    } catch (error) {
        next(error);
    }
};

export const getMemberById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const id = req.params.id as string;
        const academicYearIdStr = req.query.academicYearId as string | undefined;

        const member = await memberService.getMemberDetailById(id, entityId, academicYearIdStr);
        if (!member) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Member not found' });
        }

        res.status(HTTP_STATUS.OK).json(member);
    } catch (error) {
        next(error);
    }
};

export const createMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityIdObj = new ObjectId(req.user!.entityId as string);
        const member = new Member({ ...req.body, entityId: req.user!.entityId });

        if (!member.valid) {
            throw new AppError('Invalid member data. First Name is required.', HTTP_STATUS.BAD_REQUEST);
        }

        // Check uniqueness of admissionNo / knownId within the entity
        const admNoToCheck = (member.admissionNo || member.knownId || '').trim();
        if (admNoToCheck) {
            const existing = await getDB().collection('members').findOne({
                entityId: entityIdObj,
                $or: [
                    { admissionNo: admNoToCheck },
                    { knownId: admNoToCheck }
                ]
            });
            if (existing) {
                const existingName = `${existing.firstName || ''} ${existing.lastName || ''}`.trim() || 'another student';
                throw new AppError(
                    `Admission / ID number "${admNoToCheck}" is already assigned to ${existingName}.`,
                    HTTP_STATUS.BAD_REQUEST
                );
            }
        }

        // Check uniqueness of rollNo within the feeGroupId/class
        const targetRollNo = (member.rollNo || '').trim();
        const targetGroupId = req.body.feeGroupId ? new ObjectId(req.body.feeGroupId as string) : member.feeGroupId;
        if (targetRollNo && targetGroupId) {
            const existingRoll = await getDB().collection('members').findOne({
                entityId: entityIdObj,
                feeGroupId: targetGroupId,
                rollNo: targetRollNo
            });
            if (existingRoll) {
                const existingName = `${existingRoll.firstName || ''} ${existingRoll.lastName || ''}`.trim() || 'another student';
                throw new AppError(
                    `Roll number "${targetRollNo}" is already assigned to student ${existingName} in this class.`,
                    HTTP_STATUS.BAD_REQUEST
                );
            }
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
            'concessionType', 'concessionMode', 'concessionValue', 'concessionReason',
            'feeGroupId', 'feeStructureId', 'addonFeeIds', 'profilePicUrl', 'academicYearId', 'status', 'documents'
        ];
        let updateData: any = { $set: {} };
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'feeGroupId' || field === 'feeStructureId' || field === 'academicYearId') {
                    updateData.$set[field] = req.body[field] ? new ObjectId(req.body[field] as string) : null;
                } else if (field === 'addonFeeIds' && Array.isArray(req.body[field])) {
                    const primaryIdStr = req.body.feeStructureId?.toString();
                    updateData.$set[field] = req.body[field]
                        .filter((id: any) => id && (!primaryIdStr || id.toString() !== primaryIdStr))
                        .map((id: any) => new ObjectId(id));
                } else {
                    updateData.$set[field] = req.body[field];
                }
            }
        });

        if (Object.keys(updateData.$set).length === 0) {
            delete updateData.$set;
        }

        // If admissionNo or knownId is being updated, check uniqueness
        const updatedAdmNo = (updateData.$set?.admissionNo || updateData.$set?.knownId || '').trim();
        if (updatedAdmNo) {
            const existing = await getDB().collection('members').findOne({
                entityId: new ObjectId(req.user!.entityId),
                _id: { $ne: new ObjectId(id as string) },
                $or: [
                    { admissionNo: updatedAdmNo },
                    { knownId: updatedAdmNo }
                ]
            });
            if (existing) {
                const existingName = `${existing.firstName || ''} ${existing.lastName || ''}`.trim() || 'another student';
                throw new AppError(
                    `Admission / ID number "${updatedAdmNo}" is already assigned to ${existingName}.`,
                    HTTP_STATUS.BAD_REQUEST
                );
            }
        }

        // If rollNo or feeGroupId is being updated, check uniqueness within that class
        const targetRollNo = (updateData.$set?.rollNo !== undefined ? updateData.$set.rollNo : req.body.rollNo || '').trim();
        if (targetRollNo) {
            let targetGroupId = updateData.$set?.feeGroupId;
            if (!targetGroupId) {
                const currentMember = await memberService.getOne({ _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId) });
                targetGroupId = currentMember?.feeGroupId;
            }
            if (targetGroupId) {
                const existingRoll = await getDB().collection('members').findOne({
                    entityId: new ObjectId(req.user!.entityId),
                    _id: { $ne: new ObjectId(id as string) },
                    feeGroupId: targetGroupId,
                    rollNo: targetRollNo
                });
                if (existingRoll) {
                    const existingName = `${existingRoll.firstName || ''} ${existingRoll.lastName || ''}`.trim() || 'another student';
                    throw new AppError(
                        `Roll number "${targetRollNo}" is already assigned to student ${existingName} in this class.`,
                        HTTP_STATUS.BAD_REQUEST
                    );
                }
            }
        }

        // Room capacity check for PG/Hostel if feeGroupId is updated or member status changed to active
        if (updateData.$set?.feeGroupId !== undefined || updateData.$set?.status === 'active') {
            const currentMember = await memberService.getOne({ _id: new ObjectId(id as string), entityId: new ObjectId(req.user!.entityId) });
            const targetGroupId = updateData.$set?.feeGroupId !== undefined ? updateData.$set.feeGroupId : currentMember?.feeGroupId;
            const targetStatus = updateData.$set?.status !== undefined ? updateData.$set.status : currentMember?.status || 'active';

            if (targetGroupId && targetStatus === 'active') {
                const isGroupChanging = !currentMember?.feeGroupId || currentMember.feeGroupId.toString() !== targetGroupId.toString();
                const isReactivating = currentMember?.status !== 'active' && targetStatus === 'active';

                if (isGroupChanging || isReactivating) {
                    const entityIdObj = new ObjectId(req.user!.entityId);
                    const [group, entityDoc, roomActiveMembers] = await Promise.all([
                        feeGroupService.getOne({ _id: targetGroupId, entityId: entityIdObj }),
                        getDB().collection('entities').findOne({ _id: entityIdObj }),
                        memberService.get({
                            entityId: entityIdObj,
                            feeGroupId: targetGroupId,
                            status: 'active',
                            _id: { $ne: new ObjectId(id as string) }
                        } as any)
                    ]);

                    if (group && (entityDoc?.type === 'pg' || entityDoc?.type === 'hostel')) {
                        const capacity = group.capacity || 1;
                        if (roomActiveMembers.length >= capacity) {
                            throw new AppError(`Room ${group.name} is fully occupied (${capacity}/${capacity} beds taken)`, HTTP_STATUS.BAD_REQUEST);
                        }
                    }
                }
            }
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
        console.log("Updating member ---- ", req.body);
        const entityIdObj = new ObjectId(req.user!.entityId);
        const memberIdObj = new ObjectId(id as string);

        // Room capacity check for PG/Hostel if feeGroupId is changing
        if (feeGroupId) {
            const targetGroupId = new ObjectId(feeGroupId as string);
            const currentMember = await memberService.getOne({ _id: memberIdObj, entityId: entityIdObj });

            if (!currentMember?.feeGroupId || currentMember.feeGroupId.toString() !== targetGroupId.toString()) {
                const [group, entityDoc, roomActiveMembers] = await Promise.all([
                    feeGroupService.getOne({ _id: targetGroupId, entityId: entityIdObj }),
                    getDB().collection('entities').findOne({ _id: entityIdObj }),
                    memberService.get({
                        entityId: entityIdObj,
                        feeGroupId: targetGroupId,
                        status: 'active',
                        _id: { $ne: memberIdObj }
                    } as any)
                ]);

                if (group && (entityDoc?.type === 'pg' || entityDoc?.type === 'hostel')) {
                    const capacity = group.capacity || 1;
                    if (roomActiveMembers.length >= capacity) {
                        throw new AppError(`Room ${group.name} is fully occupied (${capacity}/${capacity} beds taken)`, HTTP_STATUS.BAD_REQUEST);
                    }
                }
            }
        }

        let updateData: any = { $set: {} };

        if (feeGroupId !== undefined) {
            updateData.$set.feeGroupId = feeGroupId ? new ObjectId(feeGroupId as string) : null;
        }
        if (feeStructureId !== undefined) {
            updateData.$set.feeStructureId = feeStructureId ? new ObjectId(feeStructureId as string) : null;
        }
        if (addonFeeIds !== undefined && Array.isArray(addonFeeIds)) {
            const primaryIdStr = (feeStructureId !== undefined ? feeStructureId : null)?.toString();
            updateData.$set.addonFeeIds = addonFeeIds
                .filter((aid: any) => aid && (!primaryIdStr || aid.toString() !== primaryIdStr))
                .map((aid: any) => new ObjectId(aid));
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

        // Room capacity check for PG/Hostel when resuming
        if (member.feeGroupId) {
            const groupId = new ObjectId(member.feeGroupId);
            const entityIdObj = new ObjectId(entityId);
            const [group, entityDoc, roomActiveMembers] = await Promise.all([
                feeGroupService.getOne({ _id: groupId, entityId: entityIdObj }),
                getDB().collection('entities').findOne({ _id: entityIdObj }),
                memberService.get({
                    entityId: entityIdObj,
                    feeGroupId: groupId,
                    status: 'active',
                    _id: { $ne: new ObjectId(id) }
                } as any)
            ]);

            if (group && (entityDoc?.type === 'pg' || entityDoc?.type === 'hostel')) {
                const capacity = group.capacity || 1;
                if (roomActiveMembers.length >= capacity) {
                    throw new AppError(`Room ${group.name} is fully occupied (${capacity}/${capacity} beds taken). Please shift to another room before resuming.`, HTTP_STATUS.BAD_REQUEST);
                }
            }
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
            type: d.type || 'homework',
            dueDate: d.dueDate ? new Date(d.dueDate).toISOString().split('T')[0] : null,
            attachments: Array.isArray(d.attachments) ? d.attachments : [],
            imageUrl: Array.isArray(d.attachments) && d.attachments.length > 0 ? d.attachments[0] : (d.imageUrl || null),
            assignedDate: d.date ? new Date(d.date).toISOString().split('T')[0] : (d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : ''),
            authorName: d.createdBy?.name || 'Class Teacher'
        }));

        // Exam query (support academicYearId fallback and entity-wide exams)
        const examConditions: any[] = [{ entityId: new ObjectId(entityId) }];
        if (student.academicYearId) {
            try {
                const ayId = new ObjectId(student.academicYearId);
                examConditions.push({
                    $or: [
                        { academicYearId: ayId },
                        { academicYearId: null },
                        { academicYearId: { $exists: false } }
                    ]
                });
            } catch (_e) { /* ignore */ }
        }
        const recentExams = await examService.get({ $and: examConditions });

        // Ensure all exams referenced in results are retrieved
        const resultExamIds = (allResults || []).map((r: any) => r.examId?.toString()).filter(Boolean);
        const missingExamIds = resultExamIds.filter((id: string) => !(recentExams || []).some((e: any) => e._id?.toString() === id));
        let additionalExams: any[] = [];
        if (missingExamIds.length > 0) {
            try {
                additionalExams = await examService.get({
                    _id: { $in: missingExamIds.map((id: string) => new ObjectId(id)) }
                });
            } catch (_e) { /* ignore */ }
        }
        const combinedExams = [...(recentExams || []), ...additionalExams];

        // Grading Helper
        const calculateGrade = (pct: number): string => {
            if (pct >= 90) return 'A+';
            if (pct >= 75) return 'A';
            if (pct >= 60) return 'B';
            if (pct >= 45) return 'C';
            if (pct >= 33) return 'D';
            return 'F';
        };

        // Exam results formatting
        const results = (allResults || []).map((r: any) => {
            const ex = combinedExams.find((e: any) => e._id?.toString() === r.examId?.toString());
            const rawMarks = Array.isArray(r.marks)
                ? r.marks
                : (Array.isArray(r.subjectScores) ? r.subjectScores : (Array.isArray(r.subjects) ? r.subjects : []));

            const subjectScores = rawMarks.map((m: any) => {
                const subject = m.subjectName || m.subject || m.name || 'Subject';
                const marks = Number(m.score !== undefined ? m.score : (m.marks !== undefined ? m.marks : (m.obtainedMarks !== undefined ? m.obtainedMarks : 0)));
                const maxMarks = Number(m.maxScore !== undefined ? m.maxScore : (m.maxMarks !== undefined ? m.maxMarks : 100));
                return { subject, marks, maxMarks };
            });

            const totalMarks = subjectScores.reduce((sum: number, s: any) => sum + s.marks, 0);
            const maxMarks = subjectScores.reduce((sum: number, s: any) => sum + s.maxMarks, 0) || 100;
            const percentage = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100 * 10) / 10 : 0;
            const grade = r.grade || calculateGrade(percentage);

            return {
                examId: r.examId?.toString() || '',
                examName: ex?.name || 'Term Exam',
                subjectScores,
                totalMarks,
                maxMarks,
                percentage,
                grade,
                remarks: r.remarks || null
            };
        });

        const upcomingExams = (recentExams || [])
            .filter((e: any) => {
                if (e.feeGroupId && student.feeGroupId && e.feeGroupId.toString() !== student.feeGroupId.toString()) {
                    return false;
                }
                return true;
            })
            .slice(0, 5)
            .map((e: any) => ({
                _id: e._id?.toString() || '',
                name: e.name || '',
                startDate: e.startDate || '',
                endDate: e.endDate || '',
                feeGroupId: e.feeGroupId?.toString() || null,
                feeGroupName: group?.name || '',
                subjects: e.subjects || []
            }));

        // Fee ledger calculations (with installments & concessions)
        let feeLedger: any = null;
        try {
            feeLedger = await memberService.calculateFeeLedger(memberId, entityId, student.academicYearId?.toString());
        } catch (_err) { /* fallback to basic calculation */ }

        const totalPlanAmount = feeLedger ? feeLedger.netPayable : (feeStructures || []).reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
        const totalPaid = feeLedger ? feeLedger.totalPaid : (feePayments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const pendingDues = feeLedger ? feeLedger.totalPending : Math.max(0, totalPlanAmount - totalPaid);

        const payments = feeLedger ? feeLedger.payments : (feePayments || []).map((p: any) => ({
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
                grossPlanAmount: feeLedger ? feeLedger.grossFee : totalPlanAmount,
                concessionAmount: feeLedger ? feeLedger.concessionAmount : 0,
                concessionType: feeLedger ? feeLedger.concessionType : (student.concessionType || null),
                concessionReason: feeLedger ? feeLedger.concessionReason : (student.concessionReason || null),
                totalPlanAmount,
                totalPaid,
                pendingDues,
                nextPaymentDate: feeLedger?.installments?.find((i: any) => i.status !== 'PAID')?.dueDate || null,
                installments: feeLedger ? feeLedger.installments : [],
                payments
            },
            notices
        });
    } catch (error) {
        next(error);
    }
};

export const getMemberFeeLedger = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entityId = req.user!.entityId.toString();
        const memberId = req.params.id as string;
        const academicYearId = req.query.academicYearId as string | undefined;

        const ledger = await memberService.calculateFeeLedger(memberId, entityId, academicYearId);
        if (!ledger) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Member or fee structure not found' });
        }

        res.status(HTTP_STATUS.OK).json(ledger);
    } catch (error) {
        next(error);
    }
};

