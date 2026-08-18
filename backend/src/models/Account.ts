import { Schema, model, Document, Types } from 'mongoose';

// Chart of Accounts — org-wide (accounts are a structural definition, not a per-branch
// transaction). Journal entries are branch-scoped; accounts themselves are shared.
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface IAccount extends Document {
  orgId: Types.ObjectId;
  code: string;
  name: string;
  type: AccountType;
  isSystem: boolean; // seeded/auto-posted-to accounts — protected from deletion
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['asset', 'liability', 'equity', 'income', 'expense'], required: true },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

accountSchema.index({ orgId: 1, code: 1 }, { unique: true });
accountSchema.index({ orgId: 1, type: 1, name: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
accountSchema.plugin(tenantPlugin);

export const Account = model<IAccount>('Account', accountSchema);
