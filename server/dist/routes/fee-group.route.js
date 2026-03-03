"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fee_group_controller_1 = require("../controllers/fee-group.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// Assuming owner, admin and staff can manage groups
router.use((0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff']));
router.get('/', fee_group_controller_1.getFeeGroups);
router.post('/', fee_group_controller_1.createFeeGroup);
router.put('/:id', fee_group_controller_1.updateFeeGroup);
router.delete('/:id', fee_group_controller_1.deleteFeeGroup);
exports.default = router;
//# sourceMappingURL=fee-group.route.js.map