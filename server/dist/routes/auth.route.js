"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const user_validation_1 = require("../validations/user.validation");
const router = (0, express_1.Router)();
// Route for Login and MPIN setup
router.post('/login', (0, validate_middleware_1.validateRequest)(user_validation_1.loginSchema), auth_controller_1.loginOrSetup);
exports.default = router;
//# sourceMappingURL=auth.route.js.map