import api from './api';
import type { ApiResponse } from '../types';

export type ClearanceReason = 'resignation' | 'termination' | 'retirement' | 'contract_end';
export type ClearanceStatus = 'pending' | 'cleared';

export interface StaffClearanceDoc {
  _id: string;
  staffId: { _id: string; name: string; role: string } | string;
  reason: ClearanceReason;
  initiatedAt: string;
  initiatedById?: { _id: string; name: string } | string;
  status: ClearanceStatus;
  advancesCleared: boolean;
  assetsReturned: boolean;
  duesSettled: boolean;
  notes?: string;
  clearedAt?: string;
}

export interface ClearanceDetail {
  clearance: StaffClearanceDoc;
  outstandingAdvances: { _id: string; type: string; balanceRemaining: number }[];
  outstandingAdvanceTotal: number;
  assignedAssets: { _id: string; name: string; assetCode: string; category: string }[];
}

export const staffClearanceService = {
  list: (status?: string) => api.get<ApiResponse<StaffClearanceDoc[]>>('/staff-clearances', { params: { status } }).then(r => r.data.data ?? []),
  initiate: (d: { staffId: string; reason: ClearanceReason }) => api.post<ApiResponse<StaffClearanceDoc>>('/staff-clearances', d).then(r => r.data.data!),
  get: (id: string) => api.get<ApiResponse<ClearanceDetail>>(`/staff-clearances/${id}`).then(r => r.data.data!),
  updateChecklist: (id: string, d: Partial<Pick<StaffClearanceDoc, 'advancesCleared' | 'assetsReturned' | 'duesSettled' | 'notes'>>) =>
    api.put<ApiResponse<StaffClearanceDoc>>(`/staff-clearances/${id}`, d).then(r => r.data.data!),
  complete: (id: string) => api.post<ApiResponse<StaffClearanceDoc>>(`/staff-clearances/${id}/complete`).then(r => r.data.data!),
};
