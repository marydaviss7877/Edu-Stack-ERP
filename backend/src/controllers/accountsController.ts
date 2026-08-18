import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { Account } from '../models/Account';
import { JournalEntry } from '../models/JournalEntry';
import { orgBranchScope } from '../utils/orgBranchScope';
import { seedDefaultAccounts } from '../services/ledgerService';

export async function listAccounts(req: Request, res: Response): Promise<void> {
  const accounts = await Account.find({ orgId: req.orgId, isActive: true }).sort({ code: 1 }).lean();
  res.json({ success: true, data: accounts });
}

export const createAccountValidators = [
  body('code').trim().notEmpty(),
  body('name').trim().notEmpty(),
  body('type').isIn(['asset', 'liability', 'equity', 'income', 'expense']),
];

export async function createAccount(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }
  const { code, name, type } = req.body;
  const account = await Account.create({ orgId: req.orgId, code: code.trim(), name: name.trim(), type });
  res.status(201).json({ success: true, data: account });
}

export async function updateAccount(req: Request, res: Response): Promise<void> {
  const allowed = ['name', 'isActive'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  const account = await Account.findOneAndUpdate({ _id: req.params.id, orgId: req.orgId }, update, { new: true, runValidators: true });
  if (!account) { res.status(404).json({ success: false, message: 'Account not found' }); return; }
  res.json({ success: true, data: account });
}

export async function seedAccounts(req: Request, res: Response): Promise<void> {
  const result = await seedDefaultAccounts(req.orgId!);
  res.json({ success: true, data: result, message: `${result.created} account(s) created` });
}

export const createJournalEntryValidators = [
  body('date').isISO8601(),
  body('narration').trim().notEmpty(),
  body('lines').isArray({ min: 2 }),
  body('lines.*.accountId').isMongoId(),
];

export async function createJournalEntry(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { date, narration, lines } = req.body as { date: string; narration: string; lines: { accountId: string; debit?: number; credit?: number }[] };

  const debit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const credit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  if (debit <= 0 || Math.abs(debit - credit) > 0.01) {
    res.status(422).json({ success: false, message: `Entry does not balance — total debit (${debit}) must equal total credit (${credit})` });
    return;
  }

  const entryNo = `JE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const entry = await JournalEntry.create({
    orgId, branchId, entryNo, date, narration, source: 'manual',
    lines: lines.map((l) => ({ accountId: l.accountId, debit: Number(l.debit || 0), credit: Number(l.credit || 0) })),
    postedById: req.user!.id,
  });
  res.status(201).json({ success: true, data: entry });
}

export async function listJournalEntries(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const filter: Record<string, unknown> = orgBranchScope({ orgId: orgId!, branchId });
  if (req.query.accountId) filter['lines.accountId'] = req.query.accountId;
  if (req.query.start || req.query.end) {
    const range: Record<string, Date> = {};
    if (req.query.start) range.$gte = new Date(String(req.query.start));
    if (req.query.end) range.$lt = new Date(String(req.query.end));
    filter.date = range;
  }
  const entries = await JournalEntry.find(filter)
    .populate('lines.accountId', 'code name type')
    .populate('postedById', 'name')
    .sort({ date: -1, createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 200, 1000))
    .lean();
  res.json({ success: true, data: entries });
}

export async function getTrialBalance(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const scope = orgBranchScope({ orgId: orgId!, branchId });
  const asOf = req.query.asOf ? new Date(String(req.query.asOf)) : new Date();

  const [accounts, aggregates] = await Promise.all([
    Account.find({ orgId, isActive: true }).sort({ code: 1 }).lean(),
    JournalEntry.aggregate([
      { $match: { ...scope, date: { $lte: asOf } } },
      { $unwind: '$lines' },
      { $group: { _id: '$lines.accountId', debit: { $sum: '$lines.debit' }, credit: { $sum: '$lines.credit' } } },
    ]),
  ]);

  const byAccount = new Map(aggregates.map((a) => [String(a._id), { debit: a.debit, credit: a.credit }]));
  const rows = accounts
    .map((acc) => {
      const totals = byAccount.get(String(acc._id)) ?? { debit: 0, credit: 0 };
      const net = totals.debit - totals.credit; // positive = net debit, negative = net credit
      const isDebitNormal = acc.type === 'asset' || acc.type === 'expense';
      return {
        accountId: acc._id, code: acc.code, name: acc.name, type: acc.type,
        debitBalance: isDebitNormal ? Math.max(0, net) : Math.max(0, -net),
        creditBalance: isDebitNormal ? Math.max(0, -net) : Math.max(0, net),
        hasActivity: totals.debit > 0 || totals.credit > 0,
      };
    })
    .filter((r) => r.hasActivity)
    .map(({ hasActivity: _hasActivity, ...row }) => row);

  const totalDebit = rows.reduce((s, r) => s + r.debitBalance, 0);
  const totalCredit = rows.reduce((s, r) => s + r.creditBalance, 0);

  res.json({ success: true, data: { asOf: asOf.toISOString(), rows, totalDebit: Math.round(totalDebit), totalCredit: Math.round(totalCredit), balanced: Math.abs(totalDebit - totalCredit) < 1 } });
}

export async function getAccountLedger(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const accountIdParam = req.params.accountId;
  const scope = orgBranchScope({ orgId: orgId!, branchId });
  const entries = await JournalEntry.find({ ...scope, 'lines.accountId': accountIdParam })
    .sort({ date: 1, createdAt: 1 })
    .limit(1000)
    .lean();

  let balance = 0;
  const account = await Account.findOne({ _id: accountIdParam, orgId }).lean();
  const isDebitNormal = account?.type === 'asset' || account?.type === 'expense';

  const rows = entries.map((entry) => {
    const line = entry.lines.find((l) => String(l.accountId) === String(accountIdParam))!;
    const delta = isDebitNormal ? line.debit - line.credit : line.credit - line.debit;
    balance += delta;
    return {
      date: entry.date, entryNo: entry.entryNo, narration: entry.narration, source: entry.source,
      debit: line.debit, credit: line.credit, balance: Math.round(balance),
    };
  });

  res.json({ success: true, data: { account, rows } });
}
