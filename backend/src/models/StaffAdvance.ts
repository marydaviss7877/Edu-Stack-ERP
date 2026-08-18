import { Schema, model, Document, Types } from 'mongoose';

export type AdvanceType = 'advance' | 'loan';
export type AdvanceStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'closed';

export interface IStaffAdvance extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  staffId: Types.ObjectId;
  type: AdvanceType;
  amount: number;
  reason: string;
  requestedAt: Date;
  status: AdvanceStatus;
  approvedById?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  disbursedAt?: Date;
  disbursedMethod?: string;
  installmentAmount: number;
  installmentsTotal: number;
  installmentsPaid: number;
  balanceRemaining: number;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const staffAdvanceSchema = new Schema<IStaffAdvance>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['advance', 'loan'], required: true },
    amount: { type: Number, min: 1, required: true },
    reason: { type: String, required: true, trim: true },
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'active', 'closed'], default: 'pending' },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,
    disbursedAt: Date,
    disbursedMethod: String,
    installmentAmount: { type: Number, min: 0, default: 0 },
    installmentsTotal: { type: Number, min: 1, default: 1 },
    installmentsPaid: { type: Number, min: 0, default: 0 },
    balanceRemaining: { type: Number, min: 0, default: 0 },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

staffAdvanceSchema.index({ orgId: 1, branchId: 1, staffId: 1, status: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
staffAdvanceSchema.plugin(tenantPlugin);

export const StaffAdvance = model<IStaffAdvance>('StaffAdvance', staffAdvanceSchema);
