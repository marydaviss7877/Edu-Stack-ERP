import { Schema, model, Document, Types } from 'mongoose';

export interface IIncomeEntry extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  receiptNo: string;
  receivedAt: Date;
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'jazzcash' | 'easypaisa' | 'other';
  paymentReference?: string;
  payerName?: string;
  restrictedFund: boolean;
  fundingSource?: string;
  attachmentUrls: string[];
  status: 'received' | 'void';
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const incomeEntrySchema = new Schema<IIncomeEntry>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    receiptNo: { type: String, required: true, trim: true, uppercase: true },
    receivedAt: { type: Date, required: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, min: 0.01, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'jazzcash', 'easypaisa', 'other'],
      required: true,
    },
    paymentReference: String,
    payerName: String,
    restrictedFund: { type: Boolean, default: false },
    fundingSource: String,
    attachmentUrls: { type: [String], default: [] },
    status: { type: String, enum: ['received', 'void'], default: 'received' },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

incomeEntrySchema.index({ orgId: 1, branchId: 1, receiptNo: 1 }, { unique: true });
incomeEntrySchema.index({ orgId: 1, branchId: 1, receivedAt: -1, category: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
incomeEntrySchema.plugin(tenantPlugin);

export const IncomeEntry = model<IIncomeEntry>('IncomeEntry', incomeEntrySchema);
