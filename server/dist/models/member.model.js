"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Member = void 0;
const mongodb_1 = require("mongodb");
class Member {
    _id;
    entityId;
    firstName;
    middleName;
    lastName;
    knownId;
    dob;
    contact;
    altContact;
    fatherOccupation;
    motherOccupation;
    address;
    createdAt;
    updatedAt;
    constructor(data) {
        if (data._id)
            this._id = new mongodb_1.ObjectId(data._id);
        this.entityId = new mongodb_1.ObjectId(data.entityId);
        this.firstName = data.firstName || data.first_name;
        this.middleName = data.middleName || data.middle_name;
        this.lastName = data.lastName || data.last_name;
        this.knownId = data.knownId || data.known_id || data.rollNumber;
        this.dob = data.dob || data.dateOfBirth;
        this.contact = data.contact || data.contactNumber;
        this.altContact = data.altContact || data.alt_contact;
        this.fatherOccupation = data.fatherOccupation || data.father_occupation;
        this.motherOccupation = data.motherOccupation || data.mother_occupation;
        this.address = data.address;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
    get valid() {
        return !!(this.firstName && this.lastName && this.knownId && this.entityId);
    }
}
exports.Member = Member;
//# sourceMappingURL=member.model.js.map