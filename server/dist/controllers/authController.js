"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginOrSetup = void 0;
const db_1 = require("../config/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'ems_secure_jwt_key';
const loginOrSetup = async (req, res) => {
    try {
        const { contactNumber, mpin } = req.body;
        if (!contactNumber) {
            return res.status(400).json({ error: 'Contact number is required' });
        }
        const db = (0, db_1.getDB)();
        const usersCollection = db.collection('users');
        // Find if user exists
        const user = await usersCollection.findOne({ contactNumber });
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please contact administration.' });
        }
        // Setup Flow: If user exists but has no MPIN
        if (!user.mpin) {
            if (!mpin) {
                return res.status(200).json({ message: 'MPIN setup required', requiresSetup: true });
            }
            // Validate MPIN length
            if (mpin.length !== 4) {
                return res.status(400).json({ error: 'MPIN must be exactly 4 digits' });
            }
            // Hash the new MPIN
            const hashedMpin = await bcrypt_1.default.hash(mpin, 10);
            await usersCollection.updateOne({ _id: user._id }, { $set: { mpin: hashedMpin, updatedAt: new Date() } });
            // Generate token after setup
            const token = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role, entityId: user.entityId }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ message: 'MPIN setup successful', token, user: { id: user._id, name: user.name, role: user.role } });
        }
        // Login Flow: If user exists and has an MPIN
        if (!mpin) {
            return res.status(400).json({ error: 'MPIN is required for login' });
        }
        const isMatch = await bcrypt_1.default.compare(mpin, user.mpin);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid MPIN' });
        }
        // Generate token after successful login
        const token = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role, entityId: user.entityId }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({ message: 'Login successful', token, user: { id: user._id, name: user.name, role: user.role } });
    }
    catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.loginOrSetup = loginOrSetup;
//# sourceMappingURL=authController.js.map