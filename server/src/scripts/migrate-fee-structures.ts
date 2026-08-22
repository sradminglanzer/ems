import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems';
const client = new MongoClient(uri);

async function migrate() {
    try {
        await client.connect();
        const db = client.db();
        const membersCol = db.collection('members');

        console.log('🔄 Starting migration: Converting addonFeeIds[0] to feeStructureId...');

        const result = await membersCol.updateMany(
            {
                addonFeeIds: { $exists: true, $not: { $size: 0 } },
                $or: [{ feeStructureId: { $exists: false } }, { feeStructureId: null }]
            },
            [
                {
                    $set: {
                        feeStructureId: { $arrayElemAt: ['$addonFeeIds', 0] },
                        addonFeeIds: { $slice: ['$addonFeeIds', 1, { $size: '$addonFeeIds' }] }
                    }
                }
            ]
        );

        console.log(`✅ Migration complete!`);
        console.log(`📊 Matched documents: ${result.matchedCount}`);
        console.log(`✏️ Modified documents: ${result.modifiedCount}`);
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.close();
    }
}

migrate();
