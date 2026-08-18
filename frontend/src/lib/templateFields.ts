import type { TemplateKind } from '../services/documentTemplateService';
import type { StudentDoc } from '../services/studentService';
import type { UserDoc } from '../services/userService';
import { formatDate, roleLabel } from './utils';

export interface FieldDef {
  key: string;
  label: string;
  kind: 'text' | 'image';
}

const ORG_FIELDS: FieldDef[] = [
  { key: 'org.name', label: 'School Name', kind: 'text' },
  { key: 'org.logo', label: 'School Logo', kind: 'image' },
  { key: 'branch.name', label: 'Branch Name', kind: 'text' },
];

const ISSUE_FIELDS: FieldDef[] = [
  { key: 'issue.date', label: 'Issue Date', kind: 'text' },
  { key: 'issue.serialNo', label: 'Serial / Card No.', kind: 'text' },
  { key: 'issue.qr', label: 'Verification QR', kind: 'text' },
];

const STUDENT_FIELDS: FieldDef[] = [
  { key: 'student.name', label: 'Student Name', kind: 'text' },
  { key: 'student.photo', label: 'Student Photo', kind: 'image' },
  { key: 'student.rollNo', label: 'Roll No.', kind: 'text' },
  { key: 'student.admissionNo', label: 'Admission No.', kind: 'text' },
  { key: 'student.class', label: 'Class', kind: 'text' },
  { key: 'student.section', label: 'Section', kind: 'text' },
  { key: 'student.dob', label: 'Date of Birth', kind: 'text' },
  { key: 'student.bloodGroup', label: 'Blood Group', kind: 'text' },
  { key: 'student.address', label: 'Address', kind: 'text' },
  { key: 'student.cnic', label: 'CNIC / B-Form', kind: 'text' },
  { key: 'guardian.name', label: "Father's Name", kind: 'text' },
  { key: 'guardian.phone', label: "Father's Phone", kind: 'text' },
];

const STAFF_FIELDS: FieldDef[] = [
  { key: 'staff.name', label: 'Staff Name', kind: 'text' },
  { key: 'staff.photo', label: 'Staff Photo', kind: 'image' },
  { key: 'staff.role', label: 'Designation / Role', kind: 'text' },
  { key: 'staff.email', label: 'Email', kind: 'text' },
  { key: 'staff.phone', label: 'Phone', kind: 'text' },
];

export function fieldsForKind(kind: TemplateKind, subjectType?: 'student' | 'user'): FieldDef[] {
  if (kind === 'id_card_student') return [...STUDENT_FIELDS, ...ORG_FIELDS, ...ISSUE_FIELDS];
  if (kind === 'id_card_staff') return [...STAFF_FIELDS, ...ORG_FIELDS, ...ISSUE_FIELDS];
  // certificate — depends on who it's being issued to
  const subjectFields = subjectType === 'user' ? STAFF_FIELDS : STUDENT_FIELDS;
  return [...subjectFields, ...ORG_FIELDS, ...ISSUE_FIELDS];
}

export interface OrgBranding { name: string; logoUrl?: string | null; }
export interface BranchInfo { name: string; }

export function resolveStudentData(student: StudentDoc): Record<string, string> {
  const className = typeof student.classId === 'object' ? student.classId.name : '';
  const sectionName = typeof student.sectionId === 'object' ? student.sectionId.name : '';
  return {
    'student.name': student.profile.name,
    'student.photo': student.profile.photoUrl ?? '',
    'student.rollNo': student.rollNo,
    'student.admissionNo': student.admissionNo,
    'student.class': className,
    'student.section': sectionName,
    'student.dob': student.profile.dateOfBirth ? formatDate(student.profile.dateOfBirth) : '',
    'student.bloodGroup': student.profile.bloodGroup ?? '',
    'student.address': student.profile.address ?? '',
    'student.cnic': student.profile.cnicOrBForm ?? '',
    'guardian.name': student.guardianInfo.fatherName ?? '',
    'guardian.phone': student.guardianInfo.fatherPhone ?? '',
  };
}

export function resolveStaffData(user: UserDoc): Record<string, string> {
  return {
    'staff.name': user.name,
    'staff.photo': user.photoUrl ?? '',
    'staff.role': roleLabel(user.role),
    'staff.email': user.email,
    'staff.phone': user.phone ?? '',
  };
}

export function resolveOrgBranchData(org?: OrgBranding, branch?: BranchInfo): Record<string, string> {
  return {
    'org.name': org?.name ?? '',
    'org.logo': org?.logoUrl ?? '',
    'branch.name': branch?.name ?? '',
  };
}

export function resolveIssueMeta(serialNo: string, verificationUrl: string): Record<string, string> {
  return {
    'issue.date': formatDate(new Date()),
    'issue.serialNo': serialNo,
    'issue.qr': verificationUrl,
  };
}

export const SAMPLE_STUDENT_DATA: Record<string, string> = {
  'student.name': 'Ayesha Khan',
  'student.photo': '',
  'student.rollNo': '14',
  'student.admissionNo': '2026-0142',
  'student.class': 'Grade 10',
  'student.section': 'A',
  'student.dob': '12 Mar 2010',
  'student.bloodGroup': 'B+',
  'student.address': 'House 12, Street 5, Lahore',
  'student.cnic': '35202-1234567-1',
  'guardian.name': 'Imran Khan',
  'guardian.phone': '0300-1234567',
};

export const SAMPLE_STAFF_DATA: Record<string, string> = {
  'staff.name': 'Sana Malik',
  'staff.photo': '',
  'staff.role': 'Teacher',
  'staff.email': 'sana.malik@example.edu.pk',
  'staff.phone': '0321-9876543',
};

export const SAMPLE_ISSUE_DATA: Record<string, string> = {
  'issue.date': formatDate(new Date()),
  'issue.serialNo': 'SID-2026-00042',
  'issue.qr': 'https://example.edustack.pk/verify/sample-preview',
};
