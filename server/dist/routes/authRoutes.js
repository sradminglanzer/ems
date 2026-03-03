"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// Route for Login and MPIN setup
router.post('/login', authController_1.loginOrSetup);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map