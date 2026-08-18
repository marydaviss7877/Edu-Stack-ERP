import api from './api';
import type { ApiResponse } from '../types';

export interface HouseDoc {
  _id: string;
  name: string;
  colorHex: string;
  motto?: string;
  headTeacherId?: { _id: string; name: string } | string;
  studentCount: number;
}

export const houseService = {
  list: () => api.get<ApiResponse<HouseDoc[]>>('/houses').then(r => r.data.data ?? []),
  create: (d: Partial<HouseDoc>) => api.post<ApiResponse<HouseDoc>>('/houses', d).then(r => r.data.data!),
  update: (id: string, d: Partial<HouseDoc>) => api.put<ApiResponse<HouseDoc>>(`/houses/${id}`, d).then(r => r.data.data!),
  remove: (id: string) => api.delete(`/houses/${id}`),
};
