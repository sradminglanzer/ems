import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HTTP_STATUS, MESSAGES } from '../utils/constants';

const JWT_SECRET = process.env.JWT_SECRET || 'ems_secure_jwt_key';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
        entityId: string;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: MESSAGES.ERROR.TOKEN_MISSING });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ error: MESSAGES.ERROR.TOKEN_INVALID });
        }

        req.user = decoded as any;
        next();
    });
};

export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ error: MESSAGES.ERROR.UNAUTHORIZED_ROLE });
        }
        next();
    };
};
