import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { Account } from '../models/Account';
import { JournalEntry, JournalSource } from '../models/JournalEntry';
import { EXPENSE_CATEGORIES } from '../controllers/inventoryController';

export const CASH_CODE = '1010';
export const BANK_CODE = '1020';
export const ADVANCES_RECEIVABLE_CODE = '1040';
export const FEE_INCOME_CODE = '4010';
export const OTHER_INCOME_CODE = '4020';
export const SALARIES_EXPENSE_CODE = '5900';
export const DEPRECIATION_EXPENSE_CODE = '5950';

function expenseCode(index: number): string {
  return `5${String(index + 1).padStart(3, '0')}`; // 5001, 5002, ...
}

/** Standard PK-school starter Chart of Accounts. Safe to call repeatedly — skips accounts that already exist by code. */
export async function seedDefaultAccounts(orgId: string): Promise<{ created: number }> {
  const defaults: { code: string; name: string; type: 'asset' | 'liability' | 'equity' | 'income' | 'expense' }[] = [
    { code: CASH_CODE, name: 'Cash in Hand', type: 'asset' },
    { code: BANK_CODE, name: 'Bank Account', type: 'asset' },
    { code: ADVANCES_RECEIVABLE_CODE, name: 'Staff Advances & Loans Receivable', type: 'asset' },
    { code: '1030', name: 'Accounts Receivable — Fees', type: 'asset' },
    { code: '1510', name: 'Fixed Assets', type: 'asset' },
    { code: '1590', name: 'Accumulated Depreciation', type: 'asset' },
    { code: '2010', name: 'Accounts Payable', type: 'liability' },
    { code: '3010', name: 'Retained Operating Surplus', type: 'equity' },
    { code: FEE_INCOME_CODE, name: 'Fee Income', type: 'income' },
    { code: OTHER_INCOME_CODE, name: 'Other Income', type: 'income' },
    { code: SALARIES_EXPENSE_CODE, name: 'Salaries & Wages Expense', type: 'expense' },
    { code: DEPRECIATION_EXPENSE_CODE, name: 'Depreciation Expense', type: 'expense' },
    ...EXPENSE_CATEGORIES.filter((c) => c !== 'Salaries & Benefits').map((name, i) => ({ code: expenseCode(i), name, type: 'expense' as const })),
  ];

  let created = 0;
  for (const acc of defaults) {
    const exists = await Account.findOne({ orgId, code: acc.code }).lean();
    if (exists) continue;
    await Account.create({ ...acc, orgId, isSystem: true });
    created++;
  }
  return { created };
}

function cashOrBank(method?: string): string {
  return method === 'cash' ? CASH_CODE : BANK_CODE;
}

async function accountId(orgId: string, code: string): Promise<Types.ObjectId | null> {
  const acc = await Account.findOne({ orgId, code }).select('_id').lean();
  return acc ? new Types.ObjectId(acc._id) : null;
}

function entryNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `JE-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

interface PostParams {
  orgId: string;
  branchId: string;
  date: Date;
  narration: string;
  source: JournalSource;
  sourceRef?: string;
  postedById: string;
  lines: { code: string; debit?: number; credit?: number }[];
}

/**
 * Posts a balanced journal entry from resolved account codes. Best-effort: if the org
 * hasn't set up its Chart of Accounts yet (or a referenced code is missing), this silently
 * skips posting rather than blocking the underlying fee/expense/payroll transaction —
 * the ledger is an additive management view, not a hard dependency for day-to-day operation.
 */
async function post(params: PostParams): Promise<void> {
  try {
    const resolvedLines = await Promise.all(
      params.lines.map(async (l) => ({ accountId: await accountId(params.orgId, l.code), debit: l.debit || 0, credit: l.credit || 0 }))
    );
    if (resolvedLines.some((l) => !l.accountId)) return; // COA not seeded yet — skip quietly
    const lines = resolvedLines.map((l) => ({ accountId: l.accountId!, debit: l.debit, credit: l.credit }));
    const debit = lines.reduce((s, l) => s + l.debit, 0);
    const credit = lines.reduce((s, l) => s + l.credit, 0);
    if (debit <= 0 || Math.abs(debit - credit) > 0.01) return;

    await JournalEntry.create({
      orgId: params.orgId,
      branchId: params.branchId,
      entryNo: entryNo(),
      date: params.date,
      narration: params.narration,
      source: params.source,
      sourceRef: params.sourceRef,
      lines,
      postedById: params.postedById,
    });
  } catch (err) {
    console.error('[ledgerService] auto-post skipped:', err);
  }
}

export async function postFeePayment(orgId: string, branchId: string, amount: number, method: string, challanId: string, postedById: string): Promise<void> {
  await post({
    orgId, branchId, date: new Date(), source: 'fee_payment', sourceRef: challanId, postedById,
    narration: `Fee payment received (challan ${challanId})`,
    lines: [{ code: cashOrBank(method), debit: amount }, { code: FEE_INCOME_CODE, credit: amount }],
  });
}

export async function postExpensePayment(orgId: string, branchId: string, category: string, amount: number, method: string | undefined, expenseId: string, postedById: string): Promise<void> {
  const idx = EXPENSE_CATEGORIES.indexOf(category);
  const code = category === 'Salaries & Benefits' ? SALARIES_EXPENSE_CODE : idx >= 0 ? expenseCode(idx) : null;
  if (!code) return;
  await post({
    orgId, branchId, date: new Date(), source: 'expense', sourceRef: expenseId, postedById,
    narration: `Expense paid — ${category}`,
    lines: [{ code, debit: amount }, { code: cashOrBank(method), credit: amount }],
  });
}

export async function postIncomeReceived(orgId: string, branchId: string, amount: number, method: string, incomeId: string, postedById: string): Promise<void> {
  await post({
    orgId, branchId, date: new Date(), source: 'income', sourceRef: incomeId, postedById,
    narration: 'Other income received',
    lines: [{ code: cashOrBank(method), debit: amount }, { code: OTHER_INCOME_CODE, credit: amount }],
  });
}

export async function postPayroll(orgId: string, branchId: string, netPay: number, advanceDeduction: number, method: string | undefined, payrollId: string, postedById: string): Promise<void> {
  const lines: PostParams['lines'] = [
    { code: SALARIES_EXPENSE_CODE, debit: netPay + advanceDeduction },
    { code: cashOrBank(method), credit: netPay },
  ];
  if (advanceDeduction > 0) lines.push({ code: ADVANCES_RECEIVABLE_CODE, credit: advanceDeduction });
  await post({ orgId, branchId, date: new Date(), source: 'payroll', sourceRef: payrollId, postedById, narration: 'Payroll disbursed', lines });
}

export async function postAdvanceDisbursement(orgId: string, branchId: string, amount: number, method: string | undefined, advanceId: string, postedById: string): Promise<void> {
  await post({
    orgId, branchId, date: new Date(), source: 'staff_advance', sourceRef: advanceId, postedById,
    narration: 'Staff advance/loan disbursed',
    lines: [{ code: ADVANCES_RECEIVABLE_CODE, debit: amount }, { code: cashOrBank(method), credit: amount }],
  });
}

export async function postPosSale(orgId: string, branchId: string, amount: number, method: string, saleId: string, postedById: string): Promise<void> {
  await post({
    orgId, branchId, date: new Date(), source: 'pos_sale', sourceRef: saleId, postedById,
    narration: `POS sale (${saleId})`,
    lines: [{ code: cashOrBank(method), debit: amount }, { code: OTHER_INCOME_CODE, credit: amount }],
  });
}
