import { Schema, model, Document, Types } from 'mongoose';

export type ClearanceReason = 'resignation' | 'termination' | 'retirement' | 'contract_end';
export type ClearanceStatus = 'pending' | 'cleared';

export interface IStaffClearance extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  staffId: Types.ObjectId;
  reason: ClearanceReason;
  initiatedAt: Date;
  initiatedById: Types.ObjectId;
  status: ClearanceStatus;
  advancesCleared: boolean;
  assetsReturned: boolean;
  duesSettled: boolean;
  notes?: string;
  clearedAt?: Date;
  clearedById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const staffClearanceSchema = new Schema<IStaffClearance>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: ['resignation', 'termination', 'retirement', 'contract_end'], required: true },
    initiatedAt: { type: Date, default: Date.now },
    initiatedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'cleared'], default: 'pending' },
    advancesCleared: { type: Boolean, default: false },
    assetsReturned: { type: Boolean, default: false },
    duesSettled: { type: Boolean, default: false },
    notes: String,
    clearedAt: Date,
    clearedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

staffClearanceSchema.index({ orgId: 1, branchId: 1, staffId: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
staffClearanceSchema.plugin(tenantPlugin);

export const StaffClearance = model<IStaffClearance>('StaffClearance', staffClearanceSchema);
