"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const member_controller_1 = require("../controllers/member.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
router.use((0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff']));
router.get('/', member_controller_1.getMembers);
router.post('/', member_controller_1.createMember);
router.put('/:id', member_controller_1.updateMember);
router.delete('/:id', member_controller_1.deleteMember);
exports.default = router;
//# sourceMappingURL=member.route.js.map