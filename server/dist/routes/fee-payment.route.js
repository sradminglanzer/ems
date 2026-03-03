"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fee_payment_controller_1 = require("../controllers/fee-payment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// Assuming owner, admin and staff can manage fee payments
router.use((0, auth_middleware_1.requireRole)(['owner', 'admin', 'staff']));
router.get('/', fee_payment_controller_1.getFeePayments);
router.post('/', fee_payment_controller_1.createFeePayment);
exports.default = router;
//# sourceMappingURL=fee-payment.route.js.map