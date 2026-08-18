import api from './api';
import type { ApiResponse } from '../types';

export type AdvanceType = 'advance' | 'loan';
export type AdvanceStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'closed';

export interface StaffAdvanceDoc {
  _id: string;
  staffId: { _id: string; name: string; role: string } | string;
  type: AdvanceType;
  amount: number;
  reason: string;
  requestedAt: string;
  status: AdvanceStatus;
  approvedById?: { _id: string; name: string } | string;
  approvedAt?: string;
  rejectionReason?: string;
  disbursedAt?: string;
  disbursedMethod?: string;
  installmentAmount: number;
  installmentsTotal: number;
  installmentsPaid: number;
  balanceRemaining: number;
}

export const staffAdvanceService = {
  list: (params?: { status?: string; staffId?: string }) =>
    api.get<ApiResponse<StaffAdvanceDoc[]>>('/staff-advances', { params }).then(r => r.data.data ?? []),
  create: (d: { staffId: string; type: AdvanceType; amount: number; reason: string; installmentsTotal?: number }) =>
    api.post<ApiResponse<StaffAdvanceDoc>>('/staff-advances', d).then(r => r.data.data!),
  action: (id: string, action: 'approve' | 'reject' | 'disburse', data?: Record<string, string>) =>
    api.post<ApiResponse<StaffAdvanceDoc>>(`/staff-advances/${id}/${action}`, data).then(r => r.data.data!),
};
