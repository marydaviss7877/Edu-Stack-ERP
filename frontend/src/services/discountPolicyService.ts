import api from './api';
import type { ApiResponse } from '../types';

export type DiscountRuleType = 'sibling' | 'label';
export type DiscountValueType = 'percent' | 'fixed';

export interface DiscountPolicyDoc {
  _id: string;
  name: string;
  description?: string;
  type: DiscountRuleType;
  labelId?: { _id: string; name: string; colorHex: string } | string;
  siblingMinRank?: number;
  valueType: DiscountValueType;
  value: number;
  classIds: ({ _id: string; name: string } | string)[];
  isActive: boolean;
}

export const discountPolicyService = {
  list: () => api.get<ApiResponse<DiscountPolicyDoc[]>>('/discount-policies').then(r => r.data.data ?? []),

  create: (d: Partial<DiscountPolicyDoc>) =>
    api.post<ApiResponse<DiscountPolicyDoc>>('/discount-policies', d).then(r => r.data.data!),

  update: (id: string, d: Partial<DiscountPolicyDoc>) =>
    api.put<ApiResponse<DiscountPolicyDoc>>(`/discount-policies/${id}`, d).then(r => r.data.data!),

  remove: (id: string) => api.delete(`/discount-policies/${id}`),

  apply: (data: { month: string; classId?: string }) =>
    api.post<ApiResponse<{ updated: number; totalDiscountApplied: number }>>('/discount-policies/apply', data).then(r => r.data),
};
