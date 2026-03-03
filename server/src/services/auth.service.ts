import { BaseService } from './base.service';
import { User } from '../models/types';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS, MESSAGES } from '../utils/constants';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ems_secure_jwt_key';

class AuthService extends BaseService<User> {
    constructor() {
        super('users');
    }

    async handleLoginOrSetup(contactNumber: string, mpin?: string) {
        const user = await this.getOne({ contactNumber });

        if (!user) {
            throw new AppError(MESSAGES.ERROR.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
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
            return {
                message: MESSAGES.SUCCESS.MPIN_SETUP_SUCCESS,
                token,
                user: this.formatUserResponse(user as User)
            };
        }

        // Login Flow
        if (!mpin) {
            throw new AppError(MESSAGES.ERROR.MPIN_REQUIRED, HTTP_STATUS.BAD_REQUEST);
        }

        const isMatch = await bcrypt.compare(mpin, user.mpin);
        if (!isMatch) {
            throw new AppError(MESSAGES.ERROR.INVALID_MPIN, HTTP_STATUS.UNAUTHORIZED);
        }

        const token = this.generateToken(user as User);
        return {
            message: MESSAGES.SUCCESS.LOGIN_SUCCESS,
            token,
            user: this.formatUserResponse(user as User)
        };
    }

    private generateToken(user: User): string {
        return jwt.sign({ userId: user._id, role: user.role, entityId: user.entityId }, JWT_SECRET, { expiresIn: '7d' });
    }

    private formatUserResponse(user: User) {
        return { id: user._id, name: user.name, role: user.role };
    }
}

export default new AuthService();
