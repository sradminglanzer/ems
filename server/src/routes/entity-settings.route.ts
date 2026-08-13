import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getEntitySettings, updateEntitySettings } from '../controllers/entity-settings.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getEntitySettings);
router.put('/', updateEntitySettings);

export default router;
