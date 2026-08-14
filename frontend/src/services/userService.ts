import api from './api';
import type { ApiResponse } from '../types';

export interface UserDoc { _id: string; name: string; email: string; role: string; orgId?: string; branchId?: string; phone?: string; photoUrl?: string; active: boolean; }

export const userService = {
  list: (params?: Record<string, string>) =>
    api.get<ApiResponse<UserDoc[]>>('/users', { params }).then(r => r.data.data ?? []),

  get: (id: string) => api.get<ApiResponse<UserDoc>>(`/users/${id}`).then(r => r.data.data!),

  create: (data: Partial<UserDoc> & { password?: string }) =>
    api.post<ApiResponse<UserDoc>>('/users', data).then(r => r.data.data!),

  update: (id: string, data: Partial<UserDoc>) =>
    api.put<ApiResponse<UserDoc>>(`/users/${id}`, data).then(r => r.data.data!),

  resetPassword: (id: string, newPassword: string) =>
    api.post<ApiResponse<null>>(`/users/${id}/reset-password`, { newPassword }).then(r => r.data),
};
