import { Router } from 'express';
import * as entityController from '../controllers/entity.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Public — used by login screen to fetch entity branding (logo + name)
router.get('/:id/branding', entityController.getBranding);

// Authenticated — owner/admin only
router.put('/logo', authenticateToken, requireRole(['owner', 'admin']), entityController.updateLogo);

export default router;
