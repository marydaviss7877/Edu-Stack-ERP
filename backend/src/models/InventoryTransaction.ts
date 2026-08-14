import { Schema, model, Document, Types } from 'mongoose';

export type InventoryTransactionType =
  | 'opening'
  | 'receipt'
  | 'issue'
  | 'return'
  | 'transfer'
  | 'adjustment'
  | 'maintenance'
  | 'verification'
  | 'loss'
  | 'disposal';

export interface IInventoryTransaction extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  itemId: Types.ObjectId;
  type: InventoryTransactionType;
  quantity: number;
  unitCost?: number;
  fromLocation?: string;
  toLocation?: string;
  issuedToId?: Types.ObjectId;
  referenceNo?: string;
  occurredAt: Date;
  notes?: string;
  performedById: Types.ObjectId;
  approvedById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    type: {
      type: String,
      enum: ['opening', 'receipt', 'issue', 'return', 'transfer', 'adjustment', 'maintenance', 'verification', 'loss', 'disposal'],
      required: true,
    },
    quantity: { type: Number, min: 0, required: true },
    unitCost: { type: Number, min: 0 },
    fromLocation: String,
    toLocation: String,
    issuedToId: { type: Schema.Types.ObjectId, ref: 'User' },
    referenceNo: String,
    occurredAt: { type: Date, default: Date.now },
    notes: String,
    performedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ orgId: 1, branchId: 1, itemId: 1, occurredAt: -1 });
inventoryTransactionSchema.index({ orgId: 1, branchId: 1, type: 1, occurredAt: -1 });

import { tenantPlugin } from '../utils/tenantPlugin';
inventoryTransactionSchema.plugin(tenantPlugin);

export const InventoryTransaction = model<IInventoryTransaction>('InventoryTransaction', inventoryTransactionSchema);
