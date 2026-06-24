import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/presigned-url', authenticateToken, uploadController.getPresignedUrl);

export default router;
