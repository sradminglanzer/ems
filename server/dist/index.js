"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 5001;
const startServer = async () => {
    await (0, db_1.connectDB)();
    app_1.default.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};
startServer();
//# sourceMappingURL=index.js.map