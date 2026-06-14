import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';
import { HTTP_STATUS } from '../utils/constants';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * GET /api/entities/:id/branding
 * Public endpoint — returns only name and logoUrl for pre-auth display (login screen).
 */
export const getBranding = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id as string);
        } catch {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid entity ID format' });
        }

        const db = getDB();
        const entity = await db.collection('entities').findOne(
            { _id: objectId },
            { projection: { name: 1, logoUrl: 1 } }
        );

        if (!entity) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Entity not found' });
        }

        return res.status(HTTP_STATUS.OK).json({
            name: entity.name,
            logoUrl: entity.logoUrl || null
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/entities/logo
 * Authenticated (owner/admin only) — updates the entity's logo URL.
 */
export const updateLogo = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { logoUrl } = req.body;

        if (!logoUrl || typeof logoUrl !== 'string') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'logoUrl is required' });
        }

        const entityId = new ObjectId(req.user!.entityId);

        const db = getDB();
        const result = await db.collection('entities').updateOne(
            { _id: entityId },
            { $set: { logoUrl, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Entity not found' });
        }

        return res.status(HTTP_STATUS.OK).json({ message: 'Logo updated successfully', logoUrl });
    } catch (error) {
        next(error);
    }
};
