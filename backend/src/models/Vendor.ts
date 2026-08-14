import { Schema, model, Document, Types } from 'mongoose';

export interface IVendor extends Document {
  orgId: Types.ObjectId;
  name: string;
  ntn?: string;
  strn?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  bankAccountTitle?: string;
  iban?: string;
  taxStatus: 'filer' | 'non_filer' | 'exempt' | 'unknown';
  status: 'active' | 'suspended' | 'blacklisted';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    ntn: { type: String, trim: true },
    strn: { type: String, trim: true },
    contactPerson: String,
    phone: String,
    email: { type: String, lowercase: true, trim: true },
    address: String,
    bankAccountTitle: String,
    iban: String,
    taxStatus: { type: String, enum: ['filer', 'non_filer', 'exempt', 'unknown'], default: 'unknown' },
    status: { type: String, enum: ['active', 'suspended', 'blacklisted'], default: 'active' },
    notes: String,
  },
  { timestamps: true }
);

vendorSchema.index({ orgId: 1, name: 1 });
vendorSchema.index({ orgId: 1, ntn: 1 }, { unique: true, sparse: true });

import { tenantPlugin } from '../utils/tenantPlugin';
vendorSchema.plugin(tenantPlugin);

export const Vendor = model<IVendor>('Vendor', vendorSchema);
