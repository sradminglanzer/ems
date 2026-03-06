"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fee_group_controller_1 = require("../controllers/fee-group.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// Assuming owner, admin, staff, and teacher can view groups
router.get('/', (0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff', 'teacher']), fee_group_controller_1.getFeeGroups);
// Only owner, admin and staff can manage groups
router.post('/', (0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff']), fee_group_controller_1.createFeeGroup);
router.put('/:id', (0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff']), fee_group_controller_1.updateFeeGroup);
router.delete('/:id', (0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff']), fee_group_controller_1.deleteFeeGroup);
exports.default = router;
//# sourceMappingURL=fee-group.route.js.map