import { ObjectId } from 'mongodb';

export interface IAttendanceRecord {
    memberId: ObjectId;
    status: 'present' | 'absent' | 'half-day' | 'late';
    remarks?: string;
}

export interface IAttendance {
    _id?: ObjectId;
    entityId: ObjectId;
    academicYearId?: ObjectId;
    classId: ObjectId; 
    date: Date;
    recordedBy: ObjectId; 
    records: IAttendanceRecord[];
    createdAt?: Date;
    updatedAt?: Date;
}
