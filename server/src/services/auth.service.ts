import { BaseService } from './base.service';
import { User } from '../models/types';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS, MESSAGES } from '../utils/constants';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import academicYearService from './academic-year.service';
import memberService from './member.service';
import feeGroupService from './fee-group.service';
import staffService from './staff.service';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'ems_secure_jwt_key';

class AuthService extends BaseService<User> {
    constructor() {
        super('users');
    }

    async handleLoginOrSetup(contactNumber: string, entityId?: string, mpin?: string) {
        let user: any = null;
        const cleanPhone = contactNumber ? contactNumber.toString().trim() : '';

        if (!cleanPhone) {
            throw new AppError('Contact number is required', HTTP_STATUS.BAD_REQUEST);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 1. Check if user is a Staff / Admin / Teacher in `users` collection
        // ─────────────────────────────────────────────────────────────────────
        const staffRoles: ('admin' | 'owner' | 'staff' | 'teacher')[] = ['admin', 'owner', 'staff', 'teacher'];
        if (entityId && entityId.toString().trim().length === 24) {
            const objectId = new ObjectId(entityId.toString().trim());
            user = await this.getOne({
                contactNumber: cleanPhone,
                entityId: objectId,
                role: { $in: staffRoles },
                deleted: { $ne: true }
            });
        } else {
            const matches = await this.get({
                contactNumber: cleanPhone,
                role: { $in: staffRoles },
                deleted: { $ne: true }
            });
            if (matches.length === 1) {
                user = matches[0];
            } else if (matches.length > 1) {
                // Multiple gym / business entities found
                const db = getDB();
                const entityIds = matches.map(m => m.entityId);
                const entities = await db.collection('entities')
                    .find({ _id: { $in: entityIds } })
                    .project({ name: 1, logoUrl: 1, type: 1 })
                    .toArray();

                return {
                    requiresEntitySelection: true,
                    entities: entities.map(e => ({
                        id: e._id,
                        name: e.name || 'Unknown',
                        logoUrl: e.logoUrl || null,
                        type: e.type || 'gym'
                    }))
                };
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // 2. If Staff / Admin / Teacher found: process Staff flow
        // ─────────────────────────────────────────────────────────────────────
        if (user) {
            if (user.enableLogin === false) {
                throw new AppError('Login is disabled for this account. Please contact administrator.', HTTP_STATUS.FORBIDDEN);
            }

            const { entityName, entityType, entityLogoUrl } = await this.getEntityInfo(user.entityId);

            // Check if this staff member also has children in this entity
            const enrolledChildren = await memberService.get({
                entityId: user.entityId,
                $or: [
                    { contact: cleanPhone },
                    { fatherPhone: cleanPhone },
                    { motherPhone: cleanPhone },
                    { altContact: cleanPhone },
                    { emergencyContactPhone: cleanPhone }
                ],
                status: { $ne: 'checked_out' }
            });

            // Staff Setup Flow (No MPIN set yet)
            if (!user.mpin) {
                if (!mpin) {
                    return {
                        requiresSetup: true,
                        message: MESSAGES.SUCCESS.MPIN_SETUP_REQUIRED,
                        entity: { id: user.entityId, name: entityName, logoUrl: entityLogoUrl },
                        hasParentProfile: enrolledChildren.length > 0,
                        children: enrolledChildren.length > 0 ? await this.formatChildrenResponse(enrolledChildren, entityName) : []
                    };
                }

                const hashedMpin = await bcrypt.hash(mpin, 10);
                await this.update(
                    { _id: user._id },
                    { $set: { mpin: hashedMpin, updatedAt: new Date() } }
                );

                const token = this.generateToken(user as User);
                const activeYear = await academicYearService.getOne({ entityId: user.entityId, isActive: true });

                return {
                    message: MESSAGES.SUCCESS.MPIN_SETUP_SUCCESS,
                    token,
                    user: await this.formatUserResponse(user as User, activeYear, entityName, entityType, entityLogoUrl),
                    hasParentProfile: enrolledChildren.length > 0,
                    children: enrolledChildren.length > 0 ? await this.formatChildrenResponse(enrolledChildren, entityName) : []
                };
            }

            // Staff Login Flow (MPIN exists)
            if (!mpin) {
                return {
                    requiresMpin: true,
                    message: 'Please provide your MPIN to login',
                    entity: { id: user.entityId, name: entityName, logoUrl: entityLogoUrl },
                    hasParentProfile: enrolledChildren.length > 0,
                    children: enrolledChildren.length > 0 ? await this.formatChildrenResponse(enrolledChildren, entityName) : []
                };
            }

            const isMatch = await bcrypt.compare(mpin, user.mpin);
            if (!isMatch) {
                throw new AppError(MESSAGES.ERROR.INVALID_MPIN, HTTP_STATUS.UNAUTHORIZED);
            }

            const token = this.generateToken(user as User);
            const activeYear = await academicYearService.getOne({ entityId: user.entityId, isActive: true });

            return {
                message: MESSAGES.SUCCESS.LOGIN_SUCCESS,
                token,
                user: await this.formatUserResponse(user as User, activeYear, entityName, entityType, entityLogoUrl),
                hasParentProfile: enrolledChildren.length > 0,
                children: enrolledChildren.length > 0 ? await this.formatChildrenResponse(enrolledChildren, entityName) : []
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // 3. If NOT Staff: Check if user is a Parent with enrolled student(s)
        // ─────────────────────────────────────────────────────────────────────
        const studentQuery: any = {
            $or: [
                { contact: cleanPhone },
                { fatherPhone: cleanPhone },
                { motherPhone: cleanPhone },
                { altContact: cleanPhone },
                { emergencyContactPhone: cleanPhone }
            ],
            status: { $ne: 'checked_out' }
        };

        if (entityId && entityId.toString().trim().length === 24) {
            studentQuery.entityId = new ObjectId(entityId.toString().trim());
        }

        const matchingStudents = await memberService.get(studentQuery);

        if (matchingStudents.length === 0) {
            throw new AppError(MESSAGES.ERROR.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }

        const firstStudent = matchingStudents[0]!;
        const studentEntityId = firstStudent.entityId;
        const { entityName, entityType, entityLogoUrl } = await this.getEntityInfo(studentEntityId);
        const formattedChildren = await this.formatChildrenResponse(matchingStudents, entityName);

        const defaultPin = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : '1234';
        const customPin = matchingStudents.find(s => s.parentPin)?.parentPin;
        const expectedPin = customPin || defaultPin;
        const isPinSet = !!customPin;

        // Step 1: Prompt for 4-Digit Security PIN
        if (!mpin) {
            return {
                requiresMpin: true,
                isParent: true,
                isFirstTime: !isPinSet,
                defaultPinHint: !isPinSet ? defaultPin : undefined,
                message: isPinSet ? 'Please enter your 4-Digit Security PIN' : `Welcome! Your default 4-digit PIN is the last 4 digits of your phone: ${defaultPin}`,
                entity: { id: studentEntityId, name: entityName, logoUrl: entityLogoUrl },
                children: formattedChildren
            };
        }

        // Step 2: Validate 4-Digit Security PIN
        const enteredPin = mpin.toString().trim();
        if (enteredPin !== expectedPin) {
            throw new AppError('Incorrect 4-Digit Security PIN. Please try again or contact school admin.', HTTP_STATUS.UNAUTHORIZED);
        }

        // Generate Parent Token
        const parentToken = jwt.sign(
            { userId: 'parent_' + cleanPhone, role: 'parent', entityId: studentEntityId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const parentName = firstStudent.fatherName || firstStudent.motherName || firstStudent.guardianName || 'Parent';

        return {
            message: MESSAGES.SUCCESS.LOGIN_SUCCESS,
            token: parentToken,
            user: {
                _id: 'parent_' + cleanPhone,
                id: 'parent_' + cleanPhone,
                entityId: studentEntityId,
                entityName: entityName,
                entityType: entityType,
                entityLogoUrl: entityLogoUrl,
                name: parentName,
                role: 'parent',
                phone: cleanPhone,
                contactNumber: cleanPhone,
                labels: null
            },
            isParent: true,
            children: formattedChildren
        };
    }

    private generateToken(user: User): string {
        return jwt.sign({ userId: user._id, role: user.role, entityId: user.entityId }, JWT_SECRET, { expiresIn: '7d' });
    }

    private async getEntityInfo(entityId: ObjectId | string) {
        let entityName = 'EMS Portal';
        let entityType = 'school';
        let entityLogoUrl: string | undefined;
        try {
            const db = getDB();
            if (db) {
                const entityDoc = await db.collection('entities').findOne({ _id: new ObjectId(entityId.toString()) });
                if (entityDoc) {
                    if (entityDoc.name) entityName = entityDoc.name;
                    if (entityDoc.type) entityType = entityDoc.type;
                    if (entityDoc.logoUrl) entityLogoUrl = entityDoc.logoUrl;
                }
            }
        } catch (_e) { /* ignore */ }
        return { entityName, entityType, entityLogoUrl };
    }

    private async formatChildrenResponse(students: any[], schoolName: string) {
        const result = [];
        for (const s of students) {
            let groupName = '';
            let classTeacherName: string | null = null;
            let classTeacherPhone: string | null = null;

            if (s.feeGroupId) {
                try {
                    const grp = await feeGroupService.getOne({ _id: new ObjectId(s.feeGroupId) });
                    if (grp) {
                        groupName = grp.name || '';
                        if (grp.classTeacherId) {
                            const ct = await staffService.getOne({ _id: new ObjectId(grp.classTeacherId) });
                            if (ct) {
                                classTeacherName = ct.name || null;
                                classTeacherPhone = ct.contactNumber || null;
                            }
                        }
                    }
                } catch (_e) { /* ignore */ }
            }

            result.push({
                memberId: s._id?.toString() || '',
                firstName: s.firstName || '',
                lastName: s.lastName || '',
                fullName: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
                rollNo: s.rollNo || '',
                admissionNo: s.admissionNo || '',
                knownId: s.knownId || '',
                feeGroupId: s.feeGroupId?.toString() || null,
                groupName,
                profilePicUrl: s.profilePicUrl || null,
                classTeacherName,
                classTeacherPhone,
                entityId: s.entityId?.toString() || '',
                schoolName
            });
        }
        return result;
    }

    private async formatUserResponse(user: User, activeYear?: any, entityName?: string, entityType?: string, entityLogoUrl?: string) {
        let labels = null;
        try {
            const entitySettingsService = (await import('./entity-settings.service')).default;
            const settings = await entitySettingsService.getByEntity(user.entityId.toString());
            labels = settings.labels;
        } catch (_e) { null }

        return {
            _id: user._id,
            id: user._id,
            entityId: user.entityId,
            entityName: entityName,
            entityType: entityType,
            entityLogoUrl: entityLogoUrl,
            name: user.name,
            role: user.role,
            phone: user.contactNumber,
            contactNumber: user.contactNumber,
            activeAcademicYearId: activeYear?._id,
            activeAcademicYearName: activeYear?.name,
            labels
        };
    }
}

export default new AuthService();
