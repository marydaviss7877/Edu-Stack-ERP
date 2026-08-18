import { Schema, model, Document, Types } from 'mongoose';

export type DiscountRuleType = 'sibling' | 'label';
export type DiscountValueType = 'percent' | 'fixed';

export interface IDiscountPolicy extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  name: string;
  description?: string;
  type: DiscountRuleType;
  labelId?: Types.ObjectId; // required when type === 'label'
  siblingMinRank?: number; // required when type === 'sibling' — e.g. 2 = applies from the 2nd child onward
  valueType: DiscountValueType;
  value: number;
  classIds: Types.ObjectId[]; // optional restriction; empty = applies to all classes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const discountPolicySchema = new Schema<IDiscountPolicy>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    description: String,
    type: { type: String, enum: ['sibling', 'label'], required: true },
    labelId: { type: Schema.Types.ObjectId, ref: 'Label' },
    siblingMinRank: { type: Number, min: 2 },
    valueType: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    classIds: { type: [Schema.Types.ObjectId], ref: 'Class', default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

discountPolicySchema.index({ orgId: 1, branchId: 1 });
discountPolicySchema.index({ orgId: 1, branchId: 1, isActive: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
discountPolicySchema.plugin(tenantPlugin);

export const DiscountPolicy = model<IDiscountPolicy>('DiscountPolicy', discountPolicySchema);
