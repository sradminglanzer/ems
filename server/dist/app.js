"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const AppError_1 = require("./utils/AppError");
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const user_route_1 = __importDefault(require("./routes/user.route"));
const fee_group_route_1 = __importDefault(require("./routes/fee-group.route"));
const exam_route_1 = __importDefault(require("./routes/exam.route"));
const fee_structure_route_1 = __importDefault(require("./routes/fee-structure.route"));
const member_route_1 = __importDefault(require("./routes/member.route"));
const fee_payment_route_1 = __importDefault(require("./routes/fee-payment.route"));
const dashboard_route_1 = __importDefault(require("./routes/dashboard.route"));
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Basic health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'EMS API is running' });
});
// API Routes
app.use('/api/auth', auth_route_1.default);
app.use('/api/users', user_route_1.default);
app.use('/api/fee-groups', fee_group_route_1.default);
app.use('/api/exams', exam_route_1.default);
app.use('/api/fee-structures', fee_structure_route_1.default);
app.use('/api/members', member_route_1.default);
app.use('/api/fee-payments', fee_payment_route_1.default);
app.use('/api/dashboard', dashboard_route_1.default);
// Catch-all route for undefined API endpoints
app.use((req, res, next) => {
    next(new AppError_1.AppError(`Can't find ${req.originalUrl} on this server`, 404));
});
// Global Error Handling Middleware (must be last)
app.use(error_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map