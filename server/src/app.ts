import express from 'express';
import cors from 'cors';
import { AppError } from './utils/AppError';
import authRoutes from './routes/auth.route';
import userRoutes from './routes/user.route';
import feeGroupRoutes from './routes/fee-group.route';
import examRoutes from './routes/exam.route';
import feeStructureRoutes from './routes/fee-structure.route';
import memberRoutes from './routes/member.route';
import feePaymentRoutes from './routes/fee-payment.route';
import dashboardRoutes from './routes/dashboard.route';
import academicYearRoutes from './routes/academic-year.route';
import uploadRoutes from './routes/upload.route';
import expenseRoutes from './routes/expense.route';
import attendanceRoutes from './routes/attendance.route';
import subjectRoutes from './routes/subject.route';
import diaryRoutes from './routes/diary.route';
import entityRoutes from './routes/entity.route';
import reportsRoutes from './routes/reports.route';
import entitySettingsRoutes from './routes/entity-settings.route';
import staffRoutes from './routes/staff.route';
import salaryPaymentRoutes from './routes/salary-payment.route';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
// Request Logger Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Basic health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'EMS API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fee-groups', feeGroupRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/fee-structures', feeStructureRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/fee-payments', feePaymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/entity-settings', entitySettingsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/salary-payments', salaryPaymentRoutes);

// Catch-all route for undefined API endpoints
app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global Error Handling Middleware (must be last)
app.use(errorHandler);

export default app;
