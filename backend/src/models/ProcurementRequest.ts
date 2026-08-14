import { Schema, model, Document, Types } from 'mongoose';

export type ProcurementStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'quotation'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'rejected'
  | 'cancelled';

export interface IProcurementRequest extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  requestNo: string;
  title: string;
  purpose: string;
  department?: string;
  budgetHead?: string;
  procurementMethod: 'petty_purchase' | 'quotation' | 'open_bidding' | 'direct_contracting' | 'framework' | 'other';
  items: { name: string; specifications?: string; quantity: number; unit: string; estimatedUnitCost: number }[];
  estimatedTotal: number;
  vendorId?: Types.ObjectId;
  quotationRefs: string[];
  purchaseOrderNo?: string;
  requiredBy?: Date;
  status: ProcurementStatus;
  requestedById: Types.ObjectId;
  approvedById?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const procurementRequestSchema = new Schema<IProcurementRequest>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    requestNo: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    purpose: { type: String, required: true },
    department: String,
    budgetHead: String,
    procurementMethod: {
      type: String,
      enum: ['petty_purchase', 'quotation', 'open_bidding', 'direct_contracting', 'framework', 'other'],
      default: 'quotation',
    },
    items: [{
      name: { type: String, required: true },
      specifications: String,
      quantity: { type: Number, min: 0.01, required: true },
      unit: { type: String, default: 'unit' },
      estimatedUnitCost: { type: Number, min: 0, default: 0 },
    }],
    estimatedTotal: { type: Number, min: 0, required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    quotationRefs: { type: [String], default: [] },
    purchaseOrderNo: String,
    requiredBy: Date,
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'quotation', 'ordered', 'partially_received', 'received', 'rejected', 'cancelled'],
      default: 'draft',
    },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true }
);

procurementRequestSchema.index({ orgId: 1, branchId: 1, requestNo: 1 }, { unique: true });
procurementRequestSchema.index({ orgId: 1, branchId: 1, status: 1, createdAt: -1 });

import { tenantPlugin } from '../utils/tenantPlugin';
procurementRequestSchema.plugin(tenantPlugin);

export const ProcurementRequest = model<IProcurementRequest>('ProcurementRequest', procurementRequestSchema);
