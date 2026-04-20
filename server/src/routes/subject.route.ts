import express from 'express';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../controllers/subject.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

router.route('/')
    .get(getSubjects)
    .post(createSubject);

router.route('/:id')
    .put(updateSubject)
    .delete(deleteSubject);

export default router;
