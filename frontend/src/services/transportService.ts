import api from './api';
import type { ApiResponse } from '../types';

export interface TransportRouteDoc {
  _id: string;
  name: string;
  vehicleNo: string;
  driverName?: string;
  driverPhone?: string;
  capacity?: number;
  monthlyFee: number;
  stops: string[];
  isActive: boolean;
  studentCount: number;
}

export const transportService = {
  list: (isActive?: boolean) => api.get<ApiResponse<TransportRouteDoc[]>>('/transport', { params: isActive === undefined ? undefined : { isActive } }).then(r => r.data.data ?? []),
  create: (d: Partial<TransportRouteDoc>) => api.post<ApiResponse<TransportRouteDoc>>('/transport', d).then(r => r.data.data!),
  update: (id: string, d: Partial<TransportRouteDoc>) => api.put<ApiResponse<TransportRouteDoc>>(`/transport/${id}`, d).then(r => r.data.data!),
  remove: (id: string) => api.delete(`/transport/${id}`),
};
