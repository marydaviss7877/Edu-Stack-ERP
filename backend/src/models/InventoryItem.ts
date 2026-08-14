import { Schema, model, Document, Types } from 'mongoose';

export type InventoryItemType = 'fixed_asset' | 'consumable';
export type InventoryItemStatus =
  | 'in_stock'
  | 'assigned'
  | 'under_maintenance'
  | 'lost'
  | 'disposed';

export interface IInventoryItem extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  assetCode: string;
  name: string;
  description?: string;
  type: InventoryItemType;
  category: string;
  subcategory?: string;
  unit: string;
  quantity: number;
  availableQuantity: number;
  reorderLevel: number;
  unitCost: number;
  salvageValue: number;
  purchaseDate?: Date;
  inServiceDate?: Date;
  usefulLifeMonths?: number;
  depreciationMethod: 'straight_line' | 'none';
  location?: string;
  department?: string;
  custodianId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
  serialNo?: string;
  modelNo?: string;
  warrantyExpiry?: Date;
  fundingSource?: string;
  condition: 'new' | 'good' | 'fair' | 'poor' | 'unserviceable';
  status: InventoryItemStatus;
  lastVerifiedAt?: Date;
  nextVerificationDue?: Date;
  notes?: string;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    assetCode: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: String,
    type: { type: String, enum: ['fixed_asset', 'consumable'], required: true },
    category: { type: String, required: true, trim: true },
    subcategory: String,
    unit: { type: String, default: 'unit' },
    quantity: { type: Number, min: 0, default: 1 },
    availableQuantity: { type: Number, min: 0, default: 1 },
    reorderLevel: { type: Number, min: 0, default: 0 },
    unitCost: { type: Number, min: 0, default: 0 },
    salvageValue: { type: Number, min: 0, default: 0 },
    purchaseDate: Date,
    inServiceDate: Date,
    usefulLifeMonths: { type: Number, min: 1 },
    depreciationMethod: { type: String, enum: ['straight_line', 'none'], default: 'straight_line' },
    location: String,
    department: String,
    custodianId: { type: Schema.Types.ObjectId, ref: 'User' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    serialNo: String,
    modelNo: String,
    warrantyExpiry: Date,
    fundingSource: String,
    condition: {
      type: String,
      enum: ['new', 'good', 'fair', 'poor', 'unserviceable'],
      default: 'good',
    },
    status: {
      type: String,
      enum: ['in_stock', 'assigned', 'under_maintenance', 'lost', 'disposed'],
      default: 'in_stock',
    },
    lastVerifiedAt: Date,
    nextVerificationDue: Date,
    notes: String,
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ orgId: 1, branchId: 1, assetCode: 1 }, { unique: true });
inventoryItemSchema.index({ orgId: 1, branchId: 1, type: 1, category: 1, status: 1 });
inventoryItemSchema.index({ orgId: 1, branchId: 1, availableQuantity: 1, reorderLevel: 1 });
inventoryItemSchema.index({ orgId: 1, branchId: 1, nextVerificationDue: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
inventoryItemSchema.plugin(tenantPlugin);

export const InventoryItem = model<IInventoryItem>('InventoryItem', inventoryItemSchema);
