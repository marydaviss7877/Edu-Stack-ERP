import api from './api';
import type { ApiResponse } from '../types';

export type BehaviourCategory = 'discipline' | 'academic' | 'social' | 'punctuality' | 'other';
export type BehaviourType = 'merit' | 'demerit';
export type BehaviourStatus = 'active' | 'retracted';

export interface BehaviourRecordDoc {
  _id: string;
  studentId: string | { _id: string; profile: { name: string }; rollNo: string };
  classId: string;
  sectionId: string;
  category: BehaviourCategory;
  type: BehaviourType;
  points: number;
  title: string;
  notes?: string;
  // Present only when the viewer is allowed to see who logged it (principal/group_admin, or the author themself)
  authorId?: string | { _id: string; name: string; role: string };
  authorRole?: string;
  status: BehaviourStatus;
  retractedAt?: string;
  retractionReason?: string;
  createdAt: string;
}

export interface BehaviourSummary {
  merits: number;
  demerits: number;
  netPoints: number;
  byCategory: { category: BehaviourCategory; merits: number; demerits: number; count: number }[];
}

export interface CreateBehaviourPayload {
  studentId: string;
  category: BehaviourCategory;
  type: BehaviourType;
  points: number;
  title: string;
  notes?: string;
}

export interface ChainVerification {
  valid: boolean;
  brokenAtRecordId?: string;
  totalRecords: number;
}

export const behaviourService = {
  list: (params?: Record<string, string>) =>
    api.get<ApiResponse<BehaviourRecordDoc[]>>('/behaviour', { params }).then(r => r.data.data ?? []),

  getSummary: (params?: { studentId?: string }) =>
    api.get<ApiResponse<BehaviourSummary>>('/behaviour/summary', { params }).then(r => r.data.data!),

  create: (payload: CreateBehaviourPayload) =>
    api.post<ApiResponse<BehaviourRecordDoc>>('/behaviour', payload).then(r => r.data.data!),

  retract: (id: string, reason: string) =>
    api.post<ApiResponse<BehaviourRecordDoc>>(`/behaviour/${id}/retract`, { reason }).then(r => r.data.data!),

  verifyChain: (studentId: string) =>
    api.get<ApiResponse<ChainVerification>>(`/behaviour/verify/${studentId}`).then(r => r.data.data!),
};
