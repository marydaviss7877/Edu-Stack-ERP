import { Schema, model, Document, Types } from 'mongoose';

// Generic tag entity — e.g. "Sports Team", "Scholarship Holder", "Bus Route 3", "Prefect"
export interface ILabel extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  name: string;
  colorHex: string;
  category?: string; // free-text grouping, e.g. "achievement", "transport", "custom"
  createdAt: Date;
  updatedAt: Date;
}

const labelSchema = new Schema<ILabel>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    colorHex: { type: String, required: true, default: '#6b7280' },
    category: { type: String, trim: true },
  },
  { timestamps: true }
);

labelSchema.index({ orgId: 1, branchId: 1 });
labelSchema.index({ orgId: 1, branchId: 1, name: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
labelSchema.plugin(tenantPlugin);

export const Label = model<ILabel>('Label', labelSchema);
