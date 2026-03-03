"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems';
const client = new mongodb_1.MongoClient(uri);
async function seed() {
    try {
        await client.connect();
        const db = client.db();
        const entitiesCol = db.collection('entities');
        const usersCol = db.collection('users');
        // Clear existing
        await entitiesCol.deleteMany({});
        await usersCol.deleteMany({});
        // 1. Create a School Entity
        const schoolResult = await entitiesCol.insertOne({
            name: "Springfield High School",
            address: "123 Education Lane",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const schoolId = schoolResult.insertedId;
        // 2. Create the Owner for the school
        await usersCol.insertOne({
            entityId: schoolId,
            name: "Principal Skinner",
            contactNumber: "1234567890",
            role: "owner",
            // Notice: No MPIN is set initially to test the setup flow
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log("Database seeded successfully!");
        console.log("Login with contact number: 1234567890 to trigger MPIN setup.");
    }
    catch (error) {
        console.error("Error seeding database:", error);
    }
    finally {
        await client.close();
    }
}
seed();
//# sourceMappingURL=seed.js.map