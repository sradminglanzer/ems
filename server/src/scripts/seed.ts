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
        //  2. SEED SCHOOL ENTITY INSTANCE & DEMO DATA (in entities collection)
        // ═══════════════════════════════════════════════════════════════════════════
        const schoolResult = await entitiesCol.insertOne({
            name: "Springfield High School",
            type: "school",
            address: "123 Education Lane, Springfield",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const schoolId = schoolResult.insertedId;

        // School Owner / Principal Account
        await usersCol.insertOne({
            entityId: schoolId,
            name: "Principal Skinner",
            contactNumber: "1234567890",
            role: "owner",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Academic Year
        const academicYearsCol = db.collection('academic-years');
        await academicYearsCol.deleteMany({});
        const ayResult = await academicYearsCol.insertOne({
            entityId: schoolId,
            name: "2025 - 2026",
            startDate: "2025-04-01",
            endDate: "2026-03-31",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const ayId = ayResult.insertedId;

        // School Classes (fee_groups)
        const class10A = await feeGroupsCol.insertOne({
            entityId: schoolId,
            name: "Class 10-A",
            description: "Grade 10 Section A - Science Stream",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const class9B = await feeGroupsCol.insertOne({
            entityId: schoolId,
            name: "Class 9-B",
            description: "Grade 9 Section B",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const class8A = await feeGroupsCol.insertOne({
            entityId: schoolId,
            name: "Class 8-A",
            description: "Grade 8 Section A",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // School Fee Structures
        const tuitionFee = await feeStructuresCol.insertOne({
            entityId: schoolId,
            name: "Annual Tuition Fee - Class 10",
            amount: 45000,
            type: "annual",
            feeGroupId: class10A.insertedId,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const labFee = await feeStructuresCol.insertOne({
            entityId: schoolId,
            name: "Computer & Science Lab Fee",
            amount: 5000,
            type: "one-time",
            feeGroupId: class10A.insertedId,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const transportFee = await feeStructuresCol.insertOne({
            entityId: schoolId,
            name: "Monthly Transport Fee",
            amount: 2500,
            type: "monthly",
            feeGroupId: class10A.insertedId,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Students (members)
        await membersCol.insertMany([
            {
                entityId: schoolId,
                firstName: "Rohan",
                lastName: "Verma",
                knownId: "STD-1001",
                contact: "9812345601",
                altContact: "9812345600",
                address: "42 Park Avenue, Springfield",
                feeGroupId: class10A.insertedId,
                addonFeeIds: [tuitionFee.insertedId, labFee.insertedId, transportFee.insertedId],
                status: "active",
                joiningDate: new Date(),
                yearlyRosters: [{ academicYearId: ayId, feeGroupId: class10A.insertedId }],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                entityId: schoolId,
                firstName: "Ananya",
                lastName: "Sharma",
                knownId: "STD-1002",
                contact: "9812345602",
                altContact: "9812345600",
                address: "15 Green Valley, Springfield",
                feeGroupId: class10A.insertedId,
                addonFeeIds: [tuitionFee.insertedId, labFee.insertedId],
                status: "active",
                joiningDate: new Date(),
                yearlyRosters: [{ academicYearId: ayId, feeGroupId: class10A.insertedId }],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                entityId: schoolId,
                firstName: "Aarav",
                lastName: "Gupta",
                knownId: "STD-9001",
                contact: "9812345603",
                altContact: "9812345600",
                address: "88 Sunrise Apartments, Springfield",
                feeGroupId: class9B.insertedId,
                addonFeeIds: [tuitionFee.insertedId],
                status: "active",
                joiningDate: new Date(),
                yearlyRosters: [{ academicYearId: ayId, feeGroupId: class9B.insertedId }],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                entityId: schoolId,
                firstName: "Priya",
                lastName: "Singh",
                knownId: "STD-9002",
                contact: "9812345604",
                altContact: "9812345600",
                address: "12 Lakeview Road, Springfield",
                feeGroupId: class9B.insertedId,
                addonFeeIds: [tuitionFee.insertedId, transportFee.insertedId],
                status: "active",
                joiningDate: new Date(),
                yearlyRosters: [{ academicYearId: ayId, feeGroupId: class9B.insertedId }],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

        // Staff / Teachers
        const staffCol = db.collection('staff');
        await staffCol.deleteMany({});
        await staffCol.insertMany([
            {
                entityId: schoolId,
                name: "Sunita Rao",
                contactNumber: "9811223344",
                role: "teacher",
                designation: "Head Mathematics Teacher",
                qualifications: ["M.Sc Mathematics", "B.Ed"],
                monthlySalary: 45000,
                salaryType: "monthly",
                employmentType: "full-time",
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                entityId: schoolId,
                name: "Vikram Mehta",
                contactNumber: "9811223355",
                role: "teacher",
                designation: "Senior Science Teacher",
                qualifications: ["M.Sc Physics", "B.Ed"],
                monthlySalary: 42000,
                salaryType: "monthly",
                employmentType: "full-time",
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

        // Exams
        const examsCol = db.collection('exams');
        await examsCol.deleteMany({});
        await examsCol.insertOne({
            entityId: schoolId,
            academicYearId: ayId,
            feeGroupId: class10A.insertedId,
            name: "Mid-Term Examination 2025",
            startDate: "2025-10-10",
            endDate: "2025-10-20",
            subjects: [
                { name: "Mathematics", date: "2025-10-10", startTime: "09:00 AM", endTime: "12:00 PM" },
                { name: "Science", date: "2025-10-12", startTime: "09:00 AM", endTime: "12:00 PM" },
                { name: "English", date: "2025-10-15", startTime: "09:00 AM", endTime: "12:00 PM" }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Diary / Homework
        const diaryCol = db.collection('diary');
        await diaryCol.deleteMany({});
        await diaryCol.insertMany([
            {
                entityId: schoolId,
                academicYearId: ayId,
                classId: class10A.insertedId,
                type: "homework",
                title: "Mathematics Chapter 5 Exercises",
                description: "Solve Questions 1 to 15 from Exercise 5.2 (Quadratic Equations). Submit by Friday.",
                attachments: [],
                createdBy: schoolId,
                studentTracking: [],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                entityId: schoolId,
                academicYearId: ayId,
                classId: class10A.insertedId,
                type: "announcement",
                title: "Annual Sports Meet Registration",
                description: "Registration for 100m sprint, relay, and basketball tournament opens tomorrow. Contact PE department.",
                attachments: [],
                createdBy: schoolId,
                studentTracking: [],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

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
