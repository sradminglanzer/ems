import { BaseService } from './base.service';
import { User } from '../models/types';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS, MESSAGES } from '../utils/constants';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import academicYearService from './academic-year.service';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'ems_secure_jwt_key';

class AuthService extends BaseService<User> {
    constructor() {
        super('users');
    }

    async handleLoginOrSetup(contactNumber: string, entityId: string, mpin?: string) {
        let objectId;
        try {
            objectId = new ObjectId(entityId);
        } catch (error) {
            throw new AppError('Invalid Entity ID format', HTTP_STATUS.BAD_REQUEST);
        }

        console.log('Logging in user with contact number: ', contactNumber);
        console.log('Entity ID: ', objectId, entityId, mpin);

        const user = await this.getOne({ contactNumber, entityId: objectId });

        if (!user) {
            throw new AppError(MESSAGES.ERROR.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }

        let entityName = 'EMS Portal';
        let entityType = 'school';
        try {
            const db = getDB();
            if (db) {
                const entityCol = db.collection('entities');
                const entityDoc = await entityCol.findOne({ _id: user.entityId });
                if (entityDoc) {
                    if (entityDoc.name) entityName = entityDoc.name;
                    if (entityDoc.type) entityType = entityDoc.type;
                }
            }
        } catch (e) {
            console.error('Error fetching entity name/type during login', e);
        }

        // Setup Flow
        if (!user.mpin) {
            if (!mpin) {
                return { requiresSetup: true, message: MESSAGES.SUCCESS.MPIN_SETUP_REQUIRED };
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
                user: this.formatUserResponse(user as User, activeYear, entityName, entityType)
            };
        }

        // Login Flow
        if (!mpin) {
            return { requiresMpin: true, message: 'Please provide your MPIN to login' };
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
            user: this.formatUserResponse(user as User, activeYear, entityName, entityType)
        };
    }

    private generateToken(user: User): string {
        return jwt.sign({ userId: user._id, role: user.role, entityId: user.entityId }, JWT_SECRET, { expiresIn: '7d' });
    }

    private formatUserResponse(user: User, activeYear?: any, entityName?: string, entityType?: string) {
        return {
            id: user._id,
            entityId: user.entityId,
            entityName: entityName,
            entityType: entityType,
            name: user.name,
            role: user.role,
            contactNumber: user.contactNumber,
            activeAcademicYearId: activeYear?._id,
            activeAcademicYearName: activeYear?.name
        };
    }
}

export default new AuthService();
