import { Schema, model, Document, Types } from 'mongoose';

export interface IPOSSaleLine {
  itemId: Types.ObjectId;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IPOSSale extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  saleNo: string;
  items: IPOSSaleLine[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'jazzcash' | 'easypaisa' | 'other';
  customerName?: string;
  status: 'completed' | 'voided';
  voidedReason?: string;
  soldById: Types.ObjectId;
  soldAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const posSaleLineSchema = new Schema<IPOSSaleLine>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    name: { type: String, required: true },
    qty: { type: Number, min: 1, required: true },
    unitPrice: { type: Number, min: 0, required: true },
    lineTotal: { type: Number, min: 0, required: true },
  },
  { _id: false }
);

const posSaleSchema = new Schema<IPOSSale>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    saleNo: { type: String, required: true, trim: true, uppercase: true },
    items: { type: [posSaleLineSchema], validate: (v: IPOSSaleLine[]) => v.length > 0 },
    subtotal: { type: Number, min: 0, required: true },
    discount: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0, required: true },
    paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'cheque', 'jazzcash', 'easypaisa', 'other'], required: true },
    customerName: String,
    status: { type: String, enum: ['completed', 'voided'], default: 'completed' },
    voidedReason: String,
    soldById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    soldAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

posSaleSchema.index({ orgId: 1, branchId: 1, saleNo: 1 }, { unique: true });
posSaleSchema.index({ orgId: 1, branchId: 1, soldAt: -1 });

import { tenantPlugin } from '../utils/tenantPlugin';
posSaleSchema.plugin(tenantPlugin);

export const POSSale = model<IPOSSale>('POSSale', posSaleSchema);
