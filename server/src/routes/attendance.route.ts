import express from 'express';
import { getAttendance, saveAttendance, getMemberAttendance, sendAttendanceAlerts } from '../controllers/attendance.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

router.route('/')
    .get(getAttendance)
    .post(saveAttendance);

router.post('/send-alerts', sendAttendanceAlerts);

router.route('/member/:memberId')
    .get(getMemberAttendance);

export default router;

