import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
    getEntitySettings,
    updateEntitySettings,
    getFirebaseConfig,
    updateFirebaseConfig,
    testFirebaseConfig
} from '../controllers/entity-settings.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getEntitySettings);
router.put('/', updateEntitySettings);

router.get('/firebase-config', getFirebaseConfig);
router.put('/firebase-config', updateFirebaseConfig);
router.post('/firebase-config/test', testFirebaseConfig);

export default router;
