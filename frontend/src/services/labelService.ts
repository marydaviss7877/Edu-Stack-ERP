import api from './api';
import type { ApiResponse } from '../types';

export interface LabelDoc {
  _id: string;
  name: string;
  colorHex: string;
  category?: string;
}

export const labelService = {
  list: () => api.get<ApiResponse<LabelDoc[]>>('/labels').then(r => r.data.data ?? []),
  create: (d: Partial<LabelDoc>) => api.post<ApiResponse<LabelDoc>>('/labels', d).then(r => r.data.data!),
  update: (id: string, d: Partial<LabelDoc>) => api.put<ApiResponse<LabelDoc>>(`/labels/${id}`, d).then(r => r.data.data!),
  remove: (id: string) => api.delete(`/labels/${id}`),
};
