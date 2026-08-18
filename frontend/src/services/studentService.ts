import api from './api';
import type { ApiResponse } from '../types';

export interface StudentDoc {
  _id: string;
  rollNo: string;
  admissionNo: string;
  classId: { _id: string; name: string; level: string } | string;
  sectionId: { _id: string; name: string } | string;
  status: string;
  houseId?: string;
  labelIds?: string[];
  profile: { name: string; dateOfBirth: string; gender: string; cnicOrBForm: string; photoUrl?: string; address?: string; bloodGroup?: string; };
  guardianInfo: { fatherName: string; fatherPhone: string; fatherCnic?: string; };
  admissionDate: string;
  monthlyFee?: number;
  transport?: { routeId?: string; stopName?: string; monthlyFee?: number } | null;
}

export interface CreateStudentPayload {
  email: string;
  classId: string;
  sectionId: string;
  academicYearId: string;
  profile: StudentDoc['profile'];
  guardianInfo: StudentDoc['guardianInfo'];
  previousSchool?: string;
  monthlyFee?: number;
}

export const studentService = {
  list: (params?: Record<string, string>) =>
    api.get<ApiResponse<StudentDoc[]>>('/students', { params }).then(r => ({ data: r.data.data ?? [], meta: r.data.meta })),

  get: (id: string) => api.get<ApiResponse<StudentDoc>>(`/students/${id}`).then(r => r.data.data!),

  create: (payload: CreateStudentPayload) =>
    api.post<ApiResponse<{ student: StudentDoc; tempPassword: string }>>('/students', payload).then(r => r.data.data!),

  update: (id: string, data: Partial<StudentDoc>) =>
    api.put<ApiResponse<StudentDoc>>(`/students/${id}`, data).then(r => r.data.data!),

  updateMonthlyFee: (id: string, monthlyFee: number | null) =>
    api.put<ApiResponse<StudentDoc>>(`/students/${id}`, { monthlyFee: monthlyFee ?? 0 }).then(r => r.data.data!),

  getMe: () => api.get<ApiResponse<StudentDoc>>('/students/me').then(r => r.data.data!),

  // Leaving flow
  getLeavingStatus: (id: string) =>
    api.get<ApiResponse<{
      student: StudentDoc & { leavingInfo?: { initiatedAt?: string; reason?: string; financeCleared?: boolean; financeClearedAt?: string; tcIssuedAt?: string; charCertIssuedAt?: string; leftAt?: string } };
      outstandingChallans: number;
    }>>(`/students/${id}/leaving-status`).then(r => r.data.data!),

  initiateLeavingProcess: (id: string, reason: string) =>
    api.post<ApiResponse<StudentDoc>>(`/students/${id}/initiate-leaving`, { reason }).then(r => r.data.data!),

  clearFinanceDues: (id: string, override = false) =>
    api.post<ApiResponse<{ financeCleared: boolean; outstandingChallans: number }>>(`/students/${id}/clear-dues`, { override }).then(r => r.data.data!),

  issueTc: (id: string) =>
    api.post<ApiResponse<StudentDoc>>(`/students/${id}/issue-tc`).then(r => r.data.data!),

  issueCharCert: (id: string) =>
    api.post<ApiResponse<{ charCertIssuedAt: string }>>(`/students/${id}/issue-char-cert`).then(r => r.data.data!),
};
