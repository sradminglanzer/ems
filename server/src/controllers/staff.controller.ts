import { Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AuthRequest } from '../middleware/auth.middleware';
import staffService from '../services/staff.service';
import userService from '../services/user.service';
import entitySettingsService from '../services/entity-settings.service';
import { Staff } from '../models/staff.model';
import { User } from '../models/user.model';
import { HTTP_STATUS } from '../utils/constants';
import { AppError } from '../utils/AppError';

/** 1. GET /api/staff — Get all staff with enableLogin status flag */
export const getStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const entityId = req.user.entityId.toString();
        const [staffList, usersList] = await Promise.all([
            staffService.getByEntity(entityId),
            userService.getUsersByEntity(entityId)
        ]);

        const userMap = new Map<string, any>();
        usersList.forEach((u: any) => userMap.set(u.contactNumber, u));

        const result = staffList.map((s: any) => {
            const linkedUser = userMap.get(s.contactNumber);
            return {
                ...s,
                _id: s._id.toString(),
                enableLogin: linkedUser ? linkedUser.enableLogin !== false : false,
                hasUserAccount: !!linkedUser
            };
        });

        res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        next(error);
    }
};

/** 2. POST /api/staff — Create staff and user account if enable_login is true */
export const createStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const entityId = req.user.entityId.toString();
        const { name, contactNumber, role } = req.body;

        if (!name || !contactNumber || !role) {
            throw new AppError('Name, Contact Number, and Role are required', HTTP_STATUS.BAD_REQUEST);
        }

        // 1. Insert into staff collection
        const staff = new Staff({ entityId, name, contactNumber, role });
        const staffInsertResult = await staffService.insert(staff);

        // 2. Check entity-settings for role enable_login flag
        const settings = await entitySettingsService.getByEntity(entityId);
        const matchedRole = settings.staffRoles.find(r => r.code === role);
        const shouldEnableLogin = matchedRole ? matchedRole.enable_login : (role === 'admin' || role === 'owner');

        // 3. Create user account if enable_login is true
        if (shouldEnableLogin) {
            const existingUser = await userService.getOne({
                entityId: new ObjectId(entityId),
                contactNumber
            });

            if (!existingUser) {
                const user = new User({
                    entityId,
                    name,
                    contactNumber,
                    role,
                    enableLogin: true
                });
                await userService.insert(user);
            } else {
                await userService.update(
                    { _id: existingUser._id },
                    { $set: { enableLogin: true, role, name } }
                );
            }
        }

        res.status(HTTP_STATUS.CREATED).json({
            _id: staffInsertResult.insertedId.toString(),
            entityId,
            name,
            contactNumber,
            role,
            enableLogin: shouldEnableLogin
        });
    } catch (error) {
        next(error);
    }
};

/** 3. DELETE /api/staff/:id — Delete staff and linked user account */
export const deleteStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const staffId = req.params.id as string;
        if (!staffId || !ObjectId.isValid(staffId)) {
            throw new AppError('Valid Staff ID is required', HTTP_STATUS.BAD_REQUEST);
        }

        const entityId = req.user.entityId.toString();

        const staff = await staffService.getOne({
            _id: new ObjectId(staffId),
            entityId: new ObjectId(entityId)
        });

        if (!staff) {
            throw new AppError('Staff member not found', HTTP_STATUS.NOT_FOUND);
        }

        if (staff.role === 'owner') {
            throw new AppError('Cannot delete the owner account', HTTP_STATUS.FORBIDDEN);
        }

        // Delete from staff collection
        await staffService.delete({ _id: new ObjectId(staffId) });

        // Delete linked user account from users collection
        await userService.delete({
            entityId: new ObjectId(entityId),
            contactNumber: staff.contactNumber
        });

        res.status(HTTP_STATUS.OK).json({ message: 'Staff member deleted successfully' });
    } catch (error) {
        next(error);
    }
};

/** 4. PATCH /api/staff/:id/toggle-login — Toggle enableLogin in users collection */
export const toggleStaffLogin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.entityId) {
            throw new AppError('Entity ID is required', HTTP_STATUS.BAD_REQUEST);
        }
        const staffId = req.params.id as string;
        if (!staffId || !ObjectId.isValid(staffId)) {
            throw new AppError('Valid Staff ID is required', HTTP_STATUS.BAD_REQUEST);
        }

        const entityId = req.user.entityId.toString();

        const staff = await staffService.getOne({
            _id: new ObjectId(staffId),
            entityId: new ObjectId(entityId)
        });

        if (!staff) {
            throw new AppError('Staff member not found', HTTP_STATUS.NOT_FOUND);
        }

        const existingUser = await userService.getOne({
            entityId: new ObjectId(entityId),
            contactNumber: staff.contactNumber
        });

        let newEnableLoginState = true;
        if (existingUser) {
            newEnableLoginState = !(existingUser.enableLogin !== false);
            await userService.update(
                { _id: existingUser._id },
                { $set: { enableLogin: newEnableLoginState } }
            );
        } else {
            const user = new User({
                entityId,
                name: staff.name,
                contactNumber: staff.contactNumber,
                role: staff.role,
                enableLogin: true
            });
            await userService.insert(user);
        }

        res.status(HTTP_STATUS.OK).json({
            message: `Login access ${newEnableLoginState ? 'enabled' : 'disabled'}`,
            enableLogin: newEnableLoginState
        });
    } catch (error) {
        next(error);
    }
};
