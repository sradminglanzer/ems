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
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

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

// Catch-all route for undefined API endpoints
app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global Error Handling Middleware (must be last)
app.use(errorHandler);

export default app;
