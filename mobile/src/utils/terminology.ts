export type TermKey = 'Student' | 'Students' | 'Class' | 'Classes' | 'Academic Year' | 'Academic Years' | 'Exam' | 'Exams' | 'Roll No';

export const getTerm = (term: TermKey, entityType: string | undefined): string => {
    const isGym = entityType === 'gym';
    
    switch (term) {
        case 'Student': return isGym ? 'Member' : 'Student';
        case 'Students': return isGym ? 'Members' : 'Students';
        case 'Class': return isGym ? 'Membership' : 'Class';
        case 'Classes': return isGym ? 'Memberships' : 'Classes';
        case 'Academic Year': return isGym ? 'Subscription' : 'Academic Year';
        case 'Academic Years': return isGym ? 'Subscriptions' : 'Academic Years';
        case 'Exam': return isGym ? 'Measurement' : 'Exam';
        case 'Exams': return isGym ? 'Measurements' : 'Exams';
        case 'Roll No': return isGym ? 'Member ID' : 'Roll No';
        default: return term;
    }
};
