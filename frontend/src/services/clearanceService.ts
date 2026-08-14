import api from './api';
import type { ApiResponse } from '../types';

export type ClearanceStatus = 'pending_approval' | 'scheduled' | 'completed' | 'waived';

export interface ClearanceDoc {
  _id: string;
  studentId: string | { _id: string; profile: { name: string }; rollNo: string };
  subjectId: string | { _id: string; name: string; code: string };
  classId: string | { _id: string; name: string; level: string };
  sectionId: string | { _id: string; name: string };
  triggerMonth: number;
  triggerYear: number;
  averagePercentage: number;
  status: ClearanceStatus;
  scheduledDate?: string;
  clearancePaperId?: string | { _id: string; scheduledDate: string; totalMarks: number; status: string };
  clearanceMarksObtained?: number;
  clearanceTotalMarks?: number;
  clearancePercentage?: number;
  clearancePassed?: boolean;
}

export interface ClearanceSummary {
  total: number;
  pending_approval: number;
  scheduled: number;
  completed: number;
  waived: number;
  passed: number;
  failed: number;
  passRate: number;
  averagePercentage: number;
}

export const clearanceService = {
  list: (params?: { status?: string; month?: string; year?: string; classId?: string; sectionId?: string; studentId?: string; subjectId?: string }) =>
    api.get<ApiResponse<ClearanceDoc[]>>('/clearances', { params }).then(r => r.data.data ?? []),

  get: (id: string) =>
    api.get<ApiResponse<ClearanceDoc>>(`/clearances/${id}`).then(r => r.data.data!),

  getSummary: (params?: { month?: string; year?: string }) =>
    api.get<ApiResponse<ClearanceSummary>>('/clearances/summary', { params }).then(r => r.data.data!),

  approve: (id: string, data: { scheduledDate: string; totalMarks: number; academicYearId: string }) =>
    api.post<ApiResponse<ClearanceDoc>>(`/clearances/${id}/approve`, data).then(r => r.data.data!),

  waive: (id: string) =>
    api.post<ApiResponse<ClearanceDoc>>(`/clearances/${id}/waive`).then(r => r.data.data!),

  enterMarks: (id: string, marksObtained: number) =>
    api.post<ApiResponse<ClearanceDoc>>(`/clearances/${id}/marks`, { marksObtained }).then(r => r.data.data!),
};
