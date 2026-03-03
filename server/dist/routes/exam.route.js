"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exam_controller_1 = require("../controllers/exam.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// owner, admin, and teachers can manage exams
router.use((0, auth_middleware_1.requireRole)(['owner', 'admin', 'teacher']));
router.get('/', exam_controller_1.getExams);
router.post('/', exam_controller_1.createExam);
router.get('/:examId/results', exam_controller_1.getResults);
router.post('/:examId/results', exam_controller_1.addResult);
exports.default = router;
//# sourceMappingURL=exam.route.js.map