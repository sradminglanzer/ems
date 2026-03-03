"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStaff = exports.getStaff = void 0;
const db_1 = require("../config/db");
const mongodb_1 = require("mongodb");
const getStaff = async (req, res) => {
    try {
        const db = (0, db_1.getDB)();
        const usersCol = db.collection('users');
        // Only return users for this entity, excluding the owner
        const staff = await usersCol.find({
            entityId: new mongodb_1.ObjectId(req.user.entityId),
            role: { $ne: 'owner' }
        }, { projection: { mpin: 0 } }).toArray();
        res.json(staff);
    }
    catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getStaff = getStaff;
const createStaff = async (req, res) => {
    try {
        const { name, contactNumber, role } = req.body;
        if (!name || !contactNumber || !role) {
            return res.status(400).json({ error: 'Name, contactNumber, and role are required' });
        }
        if (!['admin', 'staff', 'teacher'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const db = (0, db_1.getDB)();
        const usersCol = db.collection('users');
        // Check if phone number is already registered in the system
        const existing = await usersCol.findOne({ contactNumber });
        if (existing) {
            return res.status(400).json({ error: 'Contact number already registered' });
        }
        const newStaff = {
            entityId: new mongodb_1.ObjectId(req.user.entityId),
            name,
            contactNumber,
            role,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await usersCol.insertOne(newStaff);
        res.status(201).json({ message: 'Staff created successfully', id: result.insertedId });
    }
    catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createStaff = createStaff;
//# sourceMappingURL=staff.controller.js.map