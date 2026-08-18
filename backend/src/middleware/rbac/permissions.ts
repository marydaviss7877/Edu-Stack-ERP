import { UserRole } from '../../models/User';

type Action = 'create' | 'read' | 'update' | 'delete' | 'mark' | 'submit' | 'send' | 'approve' | 'configure' | 'export';

type Module =
  | 'org_management'
  | 'branch_management'
  | 'user_management'
  | 'student_admissions'
  | 'admission_management'
  | 'attendance'
  | 'staff_attendance'
  | 'timetable'
  | 'exams'
  | 'results'
  | 'assignments'
  | 'fee_management'
  | 'payroll'
  | 'notifications'
  | 'reports'
  | 'behaviour'
  | 'peer_feedback'
  | 'system_settings'
  | 'sop'
  | 'academic_intelligence'
  | 'exam_paper'
  | 'inventory'
  | 'procurement'
  | 'expense_management'
  | 'income_management'
  | 'finance_dashboard'
  | 'houses'
  | 'labels'
  | 'document_templates'
  | 'document_issuance'
  | 'accounting'
  | 'staff_finance'
  | 'staff_clearance'
  | 'pos'
  | 'transport';

type PermissionRule = {
  roles: UserRole[];
  actions: Action[];
  own?: boolean; // true = can only access their own records
};

// Central permissions config — API middleware reads this to enforce access.
// Frontend conditionally renders based on the same role info in the JWT.
export const PERMISSIONS: Record<Module, PermissionRule[]> = {
  org_management: [
    { roles: ['super_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['group_admin'], actions: ['read', 'update'] },
  ],

  branch_management: [
    { roles: ['super_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['group_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['branch_principal'], actions: ['read', 'update'] },
    { roles: ['it_admin'], actions: ['configure'] },
  ],

  user_management: [
    { roles: ['super_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['group_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['branch_principal'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['it_admin'], actions: ['create', 'read', 'update', 'delete'] },
  ],

  admission_management: [
    { roles: ['group_admin'], actions: ['create', 'read', 'update', 'delete', 'configure', 'approve', 'export'] },
    { roles: ['branch_principal'], actions: ['create', 'read', 'update', 'delete', 'configure', 'approve'] },
    { roles: ['coordinator'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['it_admin'], actions: ['configure', 'read'] },
    { roles: ['accountant'], actions: ['read'] },
  ],

  student_admissions: [
    { roles: ['super_admin'], actions: ['read'] },
    { roles: ['group_admin'], actions: ['read'] },
    { roles: ['branch_principal'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['coordinator'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['teacher'], actions: ['read'] },
    { roles: ['student'], actions: ['read'], own: true },
  ],

  attendance: [
    { roles: ['group_admin'], actions: ['read'] },
    { roles: ['branch_principal'], actions: ['read'] },
    { roles: ['coordinator'], actions: ['create', 'read', 'update', 'delete', 'mark'] },
    { roles: ['teacher'], actions: ['mark', 'read'] },
    { roles: ['student'], actions: ['read'], own: true },
  ],

  staff_attendance: [
    { roles: ['branch_principal'], actions: ['mark', 'read'] },
    { roles: ['it_admin'], actions: ['mark', 'read'] },
    { roles: ['teacher'], actions: ['read'], own: true },
    { roles: ['accountant'], actions: ['read'] },
  ],

  timetable: [
    { roles: ['group_admin'], actions: ['read'] },
    { roles: ['branch_principal', 'it_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['coordinator'], actions: ['read'] },
    { roles: ['teacher'], actions: ['read'] },
    { roles: ['student'], actions: ['read'] },
  ],

  exams: [
    { roles: ['group_admin'], actions: ['read'] },
    { roles: ['branch_principal'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['coordinator'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['teacher'], actions: ['read'] },
    { roles: ['student'], actions: ['read'], own: true },
  ],

  results: [
    { roles: ['group_admin'], actions: ['read'] },
    { roles: ['branch_principal'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['teacher'], actions: ['mark', 'read'] },
    { roles: ['student'], actions: ['read'], own: true },
  ],

  assignments: [
    { roles: ['group_admin'], actions: ['read'] },
    { roles: ['branch_principal'], actions: ['read'] },
    { roles: ['coordinator'], actions: ['read', 'mark'] },
    { roles: ['teacher'], actions: ['create', 'read', 'update', 'delete', 'mark'] },
    { roles: ['student'], actions: ['read', 'submit'], own: true },
  ],

  fee_management: [
    { roles: ['super_admin'], actions: ['read'] },
    { roles: ['group_admin'], actions: ['create', 'read', 'update', 'delete', 'export', 'configure'] },
    { roles: ['branch_principal'], actions: ['create', 'read', 'update', 'delete', 'export', 'configure'] },
    { roles: ['accountant'], actions: ['create', 'read', 'update', 'delete', 'export', 'configure'] },
    { roles: ['student'], actions: ['read'], own: true },
  ],

  payroll: [
    { roles: ['group_admin'], actions: ['read'] },
    { roles: ['branch_principal'], actions: ['read', 'approve'] },
    { roles: ['accountant'], actions: ['create', 'read', 'update', 'approve'] },
    { roles: ['teacher'], actions: ['read'], own: true },
  ],

  notifications: [
    { roles: ['super_admin'], actions: ['send', 'read'] },
    { roles: ['group_admin'], actions: ['send', 'read'] },
    { roles: ['branch_principal'], actions: ['send', 'read'] },
    { roles: ['coordinator'], actions: ['send', 'read'] },
    { roles: ['teacher'], actions: ['send', 'read'] },
    { roles: ['student'], actions: ['read'] },
    { roles: ['accountant'], actions: ['read'] },
    { roles: ['it_admin'], actions: ['read'] },
  ],

  reports: [
    { roles: ['super_admin'], actions: ['read', 'export'] },
    { roles: ['group_admin'], actions: ['read', 'export'] },
    { roles: ['branch_principal'], actions: ['read', 'export'] },
    { roles: ['teacher'], actions: ['read'], own: true },
    { roles: ['student'], actions: ['read'], own: true },
    { roles: ['accountant'], actions: ['read', 'export'] },
  ],

  behaviour: [
    { roles: ['group_admin'], actions: ['read'] },
    { roles: ['branch_principal'], actions: ['create', 'read', 'update'] }, // update = retract
    { roles: ['coordinator'], actions: ['create', 'read'] },
    { roles: ['teacher'], actions: ['create', 'read'] }, // own-class restriction enforced in the controller via Timetable
    { roles: ['student'], actions: ['read'], own: true },
  ],

  peer_feedback: [
    { roles: ['group_admin'], actions: ['read'] },
    { roles: ['branch_principal'], actions: ['read'] },
    { roles: ['coordinator'], actions: ['read'] },
    { roles: ['teacher'], actions: ['read'] },
    { roles: ['student'], actions: ['create', 'read'], own: true },
  ],

  sop: [
    { roles: ['group_admin', 'branch_principal', 'it_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['teacher'], actions: ['read'] },
    { roles: ['student'], actions: ['read'] },
    { roles: ['accountant'], actions: ['read'] },
  ],

  system_settings: [
    { roles: ['super_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['group_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['branch_principal'], actions: ['read', 'update'] },
    { roles: ['it_admin'], actions: ['create', 'read', 'update', 'delete'] },
  ],

  academic_intelligence: [
    { roles: ['group_admin'], actions: ['read'] },
    { roles: ['branch_principal'], actions: ['read', 'approve'] },
    { roles: ['teacher'], actions: ['create', 'read', 'update', 'mark', 'approve'] },
    { roles: ['student'], actions: ['read'], own: true },
    { roles: ['it_admin'], actions: ['create', 'read', 'update', 'delete', 'configure'] },
  ],

  exam_paper: [
    { roles: ['group_admin'], actions: ['read', 'approve'] },
    { roles: ['branch_principal'], actions: ['read', 'create', 'update', 'submit', 'approve', 'configure'] },
    { roles: ['coordinator'], actions: ['read', 'create', 'update', 'delete', 'submit', 'approve'] },
    { roles: ['teacher'], actions: ['read', 'create', 'update', 'delete', 'submit'] },
    { roles: ['it_admin'], actions: ['read', 'configure'] },
  ],

  inventory: [
    { roles: ['group_admin'], actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    { roles: ['branch_principal'], actions: ['create', 'read', 'update', 'approve', 'export'] },
    { roles: ['accountant'], actions: ['create', 'read', 'update', 'export'] },
    { roles: ['it_admin'], actions: ['create', 'read', 'update'] },
  ],

  procurement: [
    { roles: ['group_admin'], actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    { roles: ['branch_principal'], actions: ['create', 'read', 'update', 'approve', 'export'] },
    { roles: ['accountant'], actions: ['create', 'read', 'update', 'export'] },
    { roles: ['it_admin'], actions: ['create', 'read'] },
  ],

  expense_management: [
    { roles: ['group_admin'], actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    { roles: ['branch_principal'], actions: ['read', 'update', 'approve', 'export'] },
    { roles: ['accountant'], actions: ['create', 'read', 'update', 'export'] },
  ],

  income_management: [
    { roles: ['group_admin'], actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    { roles: ['branch_principal'], actions: ['read', 'export'] },
    { roles: ['accountant'], actions: ['create', 'read', 'update', 'export'] },
  ],

  finance_dashboard: [
    { roles: ['group_admin'], actions: ['read', 'export'] },
    { roles: ['branch_principal'], actions: ['read', 'export'] },
    { roles: ['accountant'], actions: ['read', 'export'] },
  ],

  houses: [
    { roles: ['group_admin', 'branch_principal', 'it_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['coordinator', 'teacher'], actions: ['read'] },
    { roles: ['student'], actions: ['read'], own: true },
  ],

  labels: [
    { roles: ['group_admin', 'branch_principal', 'it_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['coordinator', 'teacher'], actions: ['read'] },
  ],

  document_templates: [
    { roles: ['group_admin', 'branch_principal', 'it_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['coordinator'], actions: ['read'] },
  ],

  document_issuance: [
    { roles: ['group_admin', 'branch_principal', 'it_admin'], actions: ['create', 'read', 'update', 'export'] },
    { roles: ['coordinator'], actions: ['create', 'read'] },
    { roles: ['teacher'], actions: ['read'], own: true },
    { roles: ['student'], actions: ['read'], own: true },
  ],

  accounting: [
    { roles: ['group_admin', 'branch_principal', 'accountant'], actions: ['create', 'read', 'update', 'export'] },
  ],

  staff_finance: [
    { roles: ['group_admin', 'branch_principal', 'accountant'], actions: ['create', 'read', 'update', 'approve'] },
    { roles: ['teacher'], actions: ['read'], own: true },
  ],

  staff_clearance: [
    { roles: ['group_admin', 'branch_principal', 'accountant', 'it_admin'], actions: ['create', 'read', 'update'] },
  ],

  pos: [
    { roles: ['group_admin', 'branch_principal', 'accountant', 'it_admin'], actions: ['create', 'read', 'update', 'export'] },
  ],

  transport: [
    { roles: ['group_admin', 'branch_principal', 'it_admin'], actions: ['create', 'read', 'update', 'delete'] },
    { roles: ['coordinator', 'teacher', 'accountant'], actions: ['read'] },
    { roles: ['student'], actions: ['read'], own: true },
  ],
};

export function hasPermission(role: UserRole, module: Module, action: Action): boolean {
  const rules = PERMISSIONS[module];
  return rules.some((rule) => rule.roles.includes(role) && rule.actions.includes(action));
}

export function isOwnOnly(role: UserRole, module: Module): boolean {
  const rules = PERMISSIONS[module];
  const matchingRule = rules.find((rule) => rule.roles.includes(role));
  return matchingRule?.own === true;
}
