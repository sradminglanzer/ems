"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const user_validation_1 = require("../validations/user.validation");
const router = (0, express_1.Router)();
// Only owners and admins can manage staff
router.use(auth_middleware_1.authenticateToken);
router.use((0, auth_middleware_1.requireRole)(['owner', 'admin']));
router.get('/', user_controller_1.getUsers);
router.post('/', (0, validate_middleware_1.validateRequest)(user_validation_1.createUserSchema), user_controller_1.createUser);
exports.default = router;
//# sourceMappingURL=user.route.js.map