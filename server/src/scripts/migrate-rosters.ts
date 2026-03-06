import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems';
const client = new MongoClient(uri);

async function migrate() {
    try {
        await client.connect();
        const db = client.db();

        const activeYear = await db.collection('academic_years').findOne({ isActive: true });
        if (!activeYear) {
            console.error('No active academic year found. Please create one first before migrating.');
            return;
        }

        const feeGroups = await db.collection('fee_groups').find({}).toArray();
        let migratedCount = 0;

        for (const group of feeGroups) {
            // Only migrate if it has the old 'members' array 
            // AND does not already have 'yearlyRosters'
            if (group.members && Array.isArray(group.members) && (!group.yearlyRosters || group.yearlyRosters.length === 0)) {

                const newRosters = [{
                    academicYearId: activeYear._id,
                    members: group.members
                }];

                await db.collection('fee_groups').updateOne(
                    { _id: group._id },
                    {
                        $set: { yearlyRosters: newRosters },
                        $unset: { members: "" }
                    }
                );
                migratedCount++;
            }
        }

        console.log(`Successfully migrated ${migratedCount} fee groups to use 'yearlyRosters' instead of 'members'.`);
    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        await client.close();
    }
}

migrate();
