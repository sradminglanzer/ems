"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const academic_year_controller_1 = require("../controllers/academic-year.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticateToken); // Standard auth check
router.get('/', academic_year_controller_1.getAcademicYears);
router.post('/', (0, auth_middleware_1.requireRole)(['admin', 'owner']), academic_year_controller_1.createAcademicYear);
router.put('/:id', (0, auth_middleware_1.requireRole)(['admin', 'owner']), academic_year_controller_1.updateAcademicYear);
router.delete('/:id', (0, auth_middleware_1.requireRole)(['admin', 'owner']), academic_year_controller_1.deleteAcademicYear);
exports.default = router;
//# sourceMappingURL=academic-year.route.js.map