import api from './api';
import type { ApiResponse, Branch } from '../types';

export type InventoryItemType = 'fixed_asset' | 'consumable';
export type InventoryStatus = 'in_stock' | 'assigned' | 'under_maintenance' | 'lost' | 'disposed';
export type InventoryCondition = 'new' | 'good' | 'fair' | 'poor' | 'unserviceable';

export interface InventoryItem {
  _id: string;
  branchId: Branch | string;
  assetCode: string;
  name: string;
  description?: string;
  type: InventoryItemType;
  category: string;
  subcategory?: string;
  unit: string;
  quantity: number;
  availableQuantity: number;
  reorderLevel: number;
  unitCost: number;
  salvageValue: number;
  isSellable: boolean;
  salePrice: number;
  purchaseDate?: string;
  inServiceDate?: string;
  usefulLifeMonths?: number;
  location?: string;
  department?: string;
  serialNo?: string;
  modelNo?: string;
  warrantyExpiry?: string;
  fundingSource?: string;
  condition: InventoryCondition;
  status: InventoryStatus;
  lastVerifiedAt?: string;
  nextVerificationDue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryDashboard {
  totalItems: number;
  fixedAssets: number;
  consumables: number;
  acquisitionCost: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  monthlyDepreciation: number;
  lowStock: number;
  verificationOverdue: number;
  maintenanceDue: number;
  pendingExpenses: number;
  pendingProcurements: number;
}

export interface BranchPerformance {
  branchId: string;
  name: string;
  code: string;
  revenue: number;
  cashExpenses: number;
  cashSurplus: number;
  depreciation: number;
  operatingSurplus: number;
  operatingMargin: number;
  outstandingFees: number;
}

export interface FinanceSummary {
  month: string;
  currency: 'PKR';
  feeRevenue: number;
  otherIncome: number;
  totalRevenue: number;
  operatingExpenses: number;
  payroll: number;
  depreciation: number;
  cashSurplus: number;
  operatingSurplus: number;
  operatingMargin: number;
  outstandingFees: number;
  feeRecoveryRate: number;
  feeBilled: number;
  feeCollected: number;
  receivableAgeing: {
    current: { amount: number; accounts: number };
    days31to60: { amount: number; accounts: number };
    over60: { amount: number; accounts: number };
  };
  terminology: string;
  dataAsOf: string;
  branchPerformance: BranchPerformance[];
  peerBenchmark: { rank: number; branchCount: number; groupAverageMargin: number; branchMargin: number } | null;
}

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'void';
export interface Expense {
  _id: string;
  branchId: Branch | string;
  voucherNo: string;
  expenseDate: string;
  category: string;
  subcategory?: string;
  costCenter?: string;
  description: string;
  grossAmount: number;
  salesTax: number;
  withholdingTax: number;
  otherDeductions: number;
  netPaid: number;
  paymentMethod?: string;
  paymentReference?: string;
  fundingSource?: string;
  status: ExpenseStatus;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncomeEntry {
  _id: string;
  branchId: Branch | string;
  receiptNo: string;
  receivedAt: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
  payerName?: string;
  restrictedFund: boolean;
  fundingSource?: string;
  status: 'received' | 'void';
}

export type ProcurementStatus =
  | 'draft' | 'submitted' | 'approved' | 'quotation' | 'ordered'
  | 'partially_received' | 'received' | 'rejected' | 'cancelled';

export interface ProcurementRequest {
  _id: string;
  branchId: Branch | string;
  requestNo: string;
  title: string;
  purpose: string;
  department?: string;
  budgetHead?: string;
  procurementMethod: string;
  items: { name: string; specifications?: string; quantity: number; unit: string; estimatedUnitCost: number }[];
  estimatedTotal: number;
  requiredBy?: string;
  status: ProcurementStatus;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vendor {
  _id: string;
  name: string;
  ntn?: string;
  strn?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxStatus: 'filer' | 'non_filer' | 'exempt' | 'unknown';
  status: 'active' | 'suspended' | 'blacklisted';
}

export interface InventoryMetadata {
  currency: 'PKR';
  assetCategories: string[];
  expenseCategories: string[];
  incomeCategories: string[];
  procurementMethods: string[];
  note: string;
}

export const inventoryService = {
  metadata: () => api.get<ApiResponse<InventoryMetadata>>('/inventory/metadata').then(r => r.data.data!),
  dashboard: () => api.get<ApiResponse<InventoryDashboard>>('/inventory/dashboard').then(r => r.data.data!),
  finance: (month?: string, includeBenchmarks = true) => api.get<ApiResponse<FinanceSummary>>('/inventory/finance-summary', { params: { month, includeBenchmarks } }).then(r => r.data.data!),
  items: (params?: Record<string, string>) => api.get<ApiResponse<InventoryItem[]>>('/inventory/items', { params }).then(r => r.data.data ?? []),
  createItem: (data: Partial<InventoryItem> & { branchId?: string }) => api.post<ApiResponse<InventoryItem>>('/inventory/items', data).then(r => r.data.data!),
  updateItem: (id: string, data: Partial<InventoryItem>) => api.put<ApiResponse<InventoryItem>>(`/inventory/items/${id}`, data).then(r => r.data.data!),
  transact: (id: string, data: { type: string; quantity: number; fromLocation?: string; toLocation?: string; notes?: string; referenceNo?: string }) =>
    api.post(`/inventory/items/${id}/transactions`, data),
  expenses: (params?: Record<string, string>) => api.get<ApiResponse<Expense[]>>('/inventory/expenses', { params }).then(r => r.data.data ?? []),
  createExpense: (data: Partial<Expense> & { branchId?: string }) => api.post<ApiResponse<Expense>>('/inventory/expenses', data).then(r => r.data.data!),
  expenseAction: (id: string, action: 'submit' | 'approve' | 'reject' | 'pay', data?: Record<string, string>) =>
    api.post<ApiResponse<Expense>>(`/inventory/expenses/${id}/${action}`, data).then(r => r.data.data!),
  income: () => api.get<ApiResponse<IncomeEntry[]>>('/inventory/income').then(r => r.data.data ?? []),
  createIncome: (data: Partial<IncomeEntry> & { branchId?: string }) => api.post<ApiResponse<IncomeEntry>>('/inventory/income', data).then(r => r.data.data!),
  procurements: (params?: Record<string, string>) => api.get<ApiResponse<ProcurementRequest[]>>('/inventory/procurements', { params }).then(r => r.data.data ?? []),
  createProcurement: (data: Partial<ProcurementRequest> & { branchId?: string }) => api.post<ApiResponse<ProcurementRequest>>('/inventory/procurements', data).then(r => r.data.data!),
  procurementAction: (id: string, action: 'submit' | 'approve' | 'reject', data?: Record<string, string>) =>
    api.post<ApiResponse<ProcurementRequest>>(`/inventory/procurements/${id}/${action}`, data).then(r => r.data.data!),
  vendors: () => api.get<ApiResponse<Vendor[]>>('/inventory/vendors').then(r => r.data.data ?? []),
  createVendor: (data: Partial<Vendor>) => api.post<ApiResponse<Vendor>>('/inventory/vendors', data).then(r => r.data.data!),
  branches: () => api.get<ApiResponse<Branch[]>>('/branches').then(r => r.data.data ?? []),
};
