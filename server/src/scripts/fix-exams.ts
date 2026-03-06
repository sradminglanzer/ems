import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems';
const client = new MongoClient(uri);

async function fix() {
    try {
        await client.connect();
        const db = client.db();

        const activeYear = await db.collection('academic_years').findOne({ isActive: true });
        if (!activeYear) {
            console.log("No active academic year found.");
            return;
        }

        const result = await db.collection('exams').updateMany(
            { academicYearId: { $exists: false } },
            { $set: { academicYearId: activeYear._id } }
        );
        console.log(`Fixed ${result.modifiedCount} exams by attaching them to ${activeYear.name}.`);
    } catch (e) {
        console.error("Error", e);
    } finally {
        await client.close();
    }
}
fix();
