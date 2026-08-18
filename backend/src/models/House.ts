import { Schema, model, Document, Types } from 'mongoose';

export interface IHouse extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  name: string; // e.g. "Falcon", "Eagle", "Red House"
  colorHex: string;
  motto?: string;
  headTeacherId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const houseSchema = new Schema<IHouse>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    colorHex: { type: String, required: true, default: '#2563eb' },
    motto: String,
    headTeacherId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

houseSchema.index({ orgId: 1, branchId: 1 });
houseSchema.index({ orgId: 1, branchId: 1, name: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
houseSchema.plugin(tenantPlugin);

export const House = model<IHouse>('House', houseSchema);
