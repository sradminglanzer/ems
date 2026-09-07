import express from 'express';
import { getDiaryFeed, createDiaryEntry, updateDiaryEntry, deleteDiaryEntry, updateTracking, getMemberDiaryFeed } from '../controllers/diary.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

router.route('/')
    .get(getDiaryFeed)
    .post(createDiaryEntry);

router.route('/:id')
    .put(updateDiaryEntry)
    .delete(deleteDiaryEntry);

router.route('/:id/tracking')
    .put(updateTracking);

router.route('/member/:memberId')
    .get(getMemberDiaryFeed);

export default router;
