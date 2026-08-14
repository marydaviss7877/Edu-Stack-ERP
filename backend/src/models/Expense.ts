import { Schema, model, Document, Types } from 'mongoose';

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'void';

export interface IExpense extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  voucherNo: string;
  expenseDate: Date;
  category: string;
  subcategory?: string;
  costCenter?: string;
  description: string;
  vendorId?: Types.ObjectId;
  procurementRef?: string;
  grossAmount: number;
  salesTax: number;
  withholdingTax: number;
  otherDeductions: number;
  netPaid: number;
  paymentMethod?: 'cash' | 'bank_transfer' | 'cheque' | 'jazzcash' | 'easypaisa' | 'other';
  paymentReference?: string;
  fundingSource?: string;
  recurring: boolean;
  attachmentUrls: string[];
  status: ExpenseStatus;
  submittedById?: Types.ObjectId;
  approvedById?: Types.ObjectId;
  paidById?: Types.ObjectId;
  approvedAt?: Date;
  paidAt?: Date;
  rejectionReason?: string;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    voucherNo: { type: String, required: true, trim: true, uppercase: true },
    expenseDate: { type: Date, required: true },
    category: { type: String, required: true, trim: true },
    subcategory: String,
    costCenter: String,
    description: { type: String, required: true, trim: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    procurementRef: String,
    grossAmount: { type: Number, min: 0, required: true },
    salesTax: { type: Number, min: 0, default: 0 },
    withholdingTax: { type: Number, min: 0, default: 0 },
    otherDeductions: { type: Number, min: 0, default: 0 },
    netPaid: { type: Number, min: 0, required: true },
    paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'cheque', 'jazzcash', 'easypaisa', 'other'] },
    paymentReference: String,
    fundingSource: String,
    recurring: { type: Boolean, default: false },
    attachmentUrls: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected', 'paid', 'void'], default: 'draft' },
    submittedById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    paidById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    paidAt: Date,
    rejectionReason: String,
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ orgId: 1, branchId: 1, voucherNo: 1 }, { unique: true });
expenseSchema.index({ orgId: 1, branchId: 1, expenseDate: -1, status: 1 });
expenseSchema.index({ orgId: 1, branchId: 1, category: 1, expenseDate: -1 });

import { tenantPlugin } from '../utils/tenantPlugin';
expenseSchema.plugin(tenantPlugin);

export const Expense = model<IExpense>('Expense', expenseSchema);
