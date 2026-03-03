"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const staff_controller_1 = require("../controllers/staff.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Only owners and admins can manage staff
router.use(auth_middleware_1.authenticateToken);
router.use((0, auth_middleware_1.requireRole)(['owner', 'admin']));
router.get('/', staff_controller_1.getStaff);
router.post('/', staff_controller_1.createStaff);
exports.default = router;
//# sourceMappingURL=staff.route.js.map