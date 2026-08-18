import api from './api';
import type { ApiResponse } from '../types';

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface AccountDoc {
  _id: string;
  code: string;
  name: string;
  type: AccountType;
  isSystem: boolean;
  isActive: boolean;
}

export interface JournalLine {
  accountId: string | { _id: string; code: string; name: string; type: AccountType };
  debit: number;
  credit: number;
}

export interface JournalEntryDoc {
  _id: string;
  entryNo: string;
  date: string;
  narration: string;
  source: string;
  sourceRef?: string;
  lines: JournalLine[];
  postedById?: { _id: string; name: string } | string;
  createdAt: string;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalance {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export interface LedgerRow {
  date: string;
  entryNo: string;
  narration: string;
  source: string;
  debit: number;
  credit: number;
  balance: number;
}

export const accountsService = {
  list: () => api.get<ApiResponse<AccountDoc[]>>('/accounts').then(r => r.data.data ?? []),
  create: (d: { code: string; name: string; type: AccountType }) => api.post<ApiResponse<AccountDoc>>('/accounts', d).then(r => r.data.data!),
  update: (id: string, d: Partial<AccountDoc>) => api.put<ApiResponse<AccountDoc>>(`/accounts/${id}`, d).then(r => r.data.data!),
  seedDefaults: () => api.post<ApiResponse<{ created: number }>>('/accounts/seed-defaults').then(r => r.data),

  journalEntries: (params?: { accountId?: string; start?: string; end?: string }) =>
    api.get<ApiResponse<JournalEntryDoc[]>>('/accounts/journal-entries', { params }).then(r => r.data.data ?? []),
  createJournalEntry: (d: { date: string; narration: string; lines: { accountId: string; debit?: number; credit?: number }[] }) =>
    api.post<ApiResponse<JournalEntryDoc>>('/accounts/journal-entries', d).then(r => r.data.data!),

  trialBalance: (asOf?: string) => api.get<ApiResponse<TrialBalance>>('/accounts/trial-balance', { params: { asOf } }).then(r => r.data.data!),
  ledger: (accountId: string) => api.get<ApiResponse<{ account: AccountDoc; rows: LedgerRow[] }>>(`/accounts/ledger/${accountId}`).then(r => r.data.data!),
};
