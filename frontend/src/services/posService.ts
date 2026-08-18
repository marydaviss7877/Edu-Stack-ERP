import api from './api';
import type { ApiResponse } from '../types';

export interface SellableProduct {
  _id: string;
  name: string;
  assetCode: string;
  category: string;
  salePrice: number;
  availableQuantity: number;
  unit: string;
}

export interface POSSaleLine {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface POSSaleDoc {
  _id: string;
  saleNo: string;
  items: POSSaleLine[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  status: 'completed' | 'voided';
  voidedReason?: string;
  soldById?: { _id: string; name: string } | string;
  soldAt: string;
}

export interface DailySummary {
  date: string;
  saleCount: number;
  totalRevenue: number;
  byMethod: Record<string, number>;
}

export const posService = {
  products: () => api.get<ApiResponse<SellableProduct[]>>('/pos/products').then(r => r.data.data ?? []),
  sales: (params?: { status?: string; start?: string; end?: string }) =>
    api.get<ApiResponse<POSSaleDoc[]>>('/pos/sales', { params }).then(r => r.data.data ?? []),
  summary: (date?: string) => api.get<ApiResponse<DailySummary>>('/pos/summary', { params: { date } }).then(r => r.data.data!),
  checkout: (d: { items: { itemId: string; qty: number }[]; paymentMethod: string; discount?: number; customerName?: string }) =>
    api.post<ApiResponse<{ sale: POSSaleDoc; incomeEntryId: string }>>('/pos/checkout', d).then(r => r.data.data!),
  voidSale: (id: string, reason: string) => api.post<ApiResponse<POSSaleDoc>>(`/pos/sales/${id}/void`, { reason }).then(r => r.data.data!),
};
