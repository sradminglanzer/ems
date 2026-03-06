"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const member_controller_1 = require("../controllers/member.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
router.get('/', (0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff', 'teacher', 'parent']), member_controller_1.getMembers);
router.post('/', (0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff']), member_controller_1.createMember);
router.put('/:id', (0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff']), member_controller_1.updateMember);
router.delete('/:id', (0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff']), member_controller_1.deleteMember);
exports.default = router;
//# sourceMappingURL=member.route.js.map