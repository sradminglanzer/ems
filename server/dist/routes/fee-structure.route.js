"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fee_structure_controller_1 = require("../controllers/fee-structure.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
router.use((0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff']));
router.get('/', fee_structure_controller_1.getFeeStructures);
router.post('/', fee_structure_controller_1.createFeeStructure);
exports.default = router;
//# sourceMappingURL=fee-structure.route.js.map