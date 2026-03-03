"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const staffController_1 = require("../controllers/staffController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Only owners and admins can manage staff
router.use(authMiddleware_1.authenticateToken);
router.use((0, authMiddleware_1.requireRole)(['owner', 'admin']));
router.get('/', staffController_1.getStaff);
router.post('/', staffController_1.createStaff);
exports.default = router;
//# sourceMappingURL=staffRoutes.js.map