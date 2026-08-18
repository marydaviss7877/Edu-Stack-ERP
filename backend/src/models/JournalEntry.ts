import { Schema, model, Document, Types } from 'mongoose';

export type JournalSource = 'manual' | 'fee_payment' | 'expense' | 'income' | 'payroll' | 'staff_advance' | 'pos_sale';

export interface IJournalLine {
  accountId: Types.ObjectId;
  debit: number;
  credit: number;
}

export interface IJournalEntry extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  entryNo: string;
  date: Date;
  narration: string;
  source: JournalSource;
  sourceRef?: string;
  lines: IJournalLine[];
  postedById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const journalLineSchema = new Schema<IJournalLine>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    debit: { type: Number, min: 0, default: 0 },
    credit: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const journalEntrySchema = new Schema<IJournalEntry>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    entryNo: { type: String, required: true, trim: true, uppercase: true },
    date: { type: Date, required: true, default: Date.now },
    narration: { type: String, required: true, trim: true },
    source: { type: String, enum: ['manual', 'fee_payment', 'expense', 'income', 'payroll', 'staff_advance', 'pos_sale'], default: 'manual' },
    sourceRef: String,
    lines: {
      type: [journalLineSchema],
      validate: {
        validator(lines: IJournalLine[]) {
          if (!lines || lines.length < 2) return false;
          const debit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
          const credit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
          return Math.abs(debit - credit) < 0.01 && debit > 0;
        },
        message: 'Journal entry lines must have at least 2 lines and total debits must equal total credits',
      },
    },
    postedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

journalEntrySchema.index({ orgId: 1, branchId: 1, date: -1 });
journalEntrySchema.index({ orgId: 1, branchId: 1, entryNo: 1 }, { unique: true });
journalEntrySchema.index({ orgId: 1, branchId: 1, 'lines.accountId': 1, date: -1 });

import { tenantPlugin } from '../utils/tenantPlugin';
journalEntrySchema.plugin(tenantPlugin);

export const JournalEntry = model<IJournalEntry>('JournalEntry', journalEntrySchema);
