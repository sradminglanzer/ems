import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems';
const client = new MongoClient(uri);

async function seed() {
    try {
        await client.connect();
        const db = client.db();

        const entitiesCol = db.collection('entities');
        const usersCol = db.collection('users');
        const entitySettingsCol = db.collection('entity-settings');
        const feeGroupsCol = db.collection('fee-groups');
        const feeStructuresCol = db.collection('fee-structures');
        const membersCol = db.collection('members');

        // Clear existing
        await entitiesCol.deleteMany({});
        await usersCol.deleteMany({});
        await entitySettingsCol.deleteMany({});
        await feeGroupsCol.deleteMany({});
        await feeStructuresCol.deleteMany({});
        await membersCol.deleteMany({});

        // ═══════════════════════════════════════════════════════════════════════════
        //  1. SEED CATEGORY MASTER TEMPLATES IN entity-settings COLLECTION
        // ═══════════════════════════════════════════════════════════════════════════
        await entitySettingsCol.insertMany([
            {
                entityType: "pg",
                labels: {
                    memberSingle: "Tenant",
                    memberPlural: "Tenants",
                    groupSingle: "Room",
                    groupPlural: "Rooms",
                    planSingle: "Rent Plan",
                    planPlural: "Rent Plans",
                    collectionLabel: "Rent Collections",
                    memberIcon: "🪪",
                    groupIcon: "🛏️",
                    isBusinessMode: true
                },
                staffRoles: [
                    { label: "Admin", code: "admin", enable_login: true },
                    { label: "PG Manager", code: "staff", enable_login: false }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                entityType: "gym",
                labels: {
                    memberSingle: "Member",
                    memberPlural: "Members",
                    groupSingle: "Plan",
                    groupPlural: "Plans",
                    planSingle: "Billing Plan",
                    planPlural: "Billing Plans",
                    collectionLabel: "Total Collections",
                    memberIcon: "👥",
                    groupIcon: "💳",
                    isBusinessMode: true
                },
                staffRoles: [
                    { label: "Admin", code: "admin", enable_login: true },
                    { label: "Staff", code: "staff", enable_login: false }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                entityType: "school",
                labels: {
                    memberSingle: "Student",
                    memberPlural: "Students",
                    groupSingle: "Class",
                    groupPlural: "Classes",
                    planSingle: "Fee Structure",
                    planPlural: "Fee Structures",
                    collectionLabel: "Fee Collections",
                    memberIcon: "🎒",
                    groupIcon: "📚",
                    isBusinessMode: false
                },
                staffRoles: [
                    { label: "Admin", code: "admin", enable_login: true },
                    { label: "Teacher", code: "teacher", enable_login: true },
                    { label: "Staff", code: "staff", enable_login: false }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

        // ═══════════════════════════════════════════════════════════════════════════
        //  2. SEED SCHOOL ENTITY INSTANCE (in entities collection)
        // ═══════════════════════════════════════════════════════════════════════════
        const schoolResult = await entitiesCol.insertOne({
            name: "Springfield High School",
            type: "school",
            address: "123 Education Lane",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const schoolId = schoolResult.insertedId;

        await usersCol.insertOne({
            entityId: schoolId,
            name: "Principal Skinner",
            contactNumber: "1234567890",
            role: "owner",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // ═══════════════════════════════════════════════════════════════════════════
        //  3. SEED PG ENTITY INSTANCE (in entities collection)
        // ═══════════════════════════════════════════════════════════════════════════
        const pgResult = await entitiesCol.insertOne({
            name: "Sunshine Luxury Gents PG",
            type: "pg",
            address: "45 MG Road, Indiranagar, Bangalore",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const pgId = pgResult.insertedId;

        // PG Owner Account
        await usersCol.insertOne({
            entityId: pgId,
            name: "Rajesh Kumar (PG Owner)",
            contactNumber: "9876543210",
            role: "owner",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // PG Rooms (fee_groups)
        const room101Res = await feeGroupsCol.insertOne({
            entityId: pgId,
            name: "Room 101",
            description: "2-Sharing AC - Ground Floor",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const room102Res = await feeGroupsCol.insertOne({
            entityId: pgId,
            name: "Room 102",
            description: "3-Sharing Non-AC - Ground Floor",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const room204Res = await feeGroupsCol.insertOne({
            entityId: pgId,
            name: "Room 204",
            description: "2-Sharing AC - 2nd Floor",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // PG Rent Plans (fee_structures)
        const rentPlanRes = await feeStructuresCol.insertOne({
            entityId: pgId,
            name: "Monthly Rent - 2-Sharing AC",
            amount: 9000,
            type: "monthly",
            feeGroupId: room101Res.insertedId,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const depositPlanRes = await feeStructuresCol.insertOne({
            entityId: pgId,
            name: "Refundable Security Deposit",
            amount: 5000,
            type: "one_time",
            feeGroupId: room101Res.insertedId,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // PG Active Tenants (members)
        await membersCol.insertMany([
            {
                entityId: pgId,
                firstName: "Amit",
                lastName: "Sharma",
                knownId: "TEN-101",
                contact: "9876500001",
                altContact: "9876500002",
                address: "Room 204, Bed A",
                feeGroupId: room204Res.insertedId,
                addonFeeIds: [rentPlanRes.insertedId, depositPlanRes.insertedId],
                status: "active",
                joiningDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                entityId: pgId,
                firstName: "Vikas",
                lastName: "Patel",
                knownId: "TEN-102",
                contact: "9876500003",
                altContact: "9876500004",
                address: "Room 101, Bed B",
                feeGroupId: room101Res.insertedId,
                addonFeeIds: [rentPlanRes.insertedId],
                status: "active",
                joiningDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

        console.log("Database seeded successfully under Approach B!");
        console.log("---------------------------------------------------------");
        console.log("Master Category Templates in entity-settings: pg, gym, school");
        console.log("School Owner Login: 1234567890");
        console.log("PG Owner Login:     9876543210 (Sunshine Luxury Gents PG)");

    } catch (error) {
        console.error("Error seeding database:", error);
    } finally {
        await client.close();
    }
}

seed();
