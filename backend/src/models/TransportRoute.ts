import { Schema, model, Document, Types } from 'mongoose';

export interface ITransportRoute extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  name: string; // e.g. "Route 3 — Gulberg"
  vehicleNo: string;
  driverName?: string;
  driverPhone?: string;
  capacity?: number;
  monthlyFee: number;
  stops: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const transportRouteSchema = new Schema<ITransportRoute>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    vehicleNo: { type: String, required: true, trim: true },
    driverName: String,
    driverPhone: String,
    capacity: { type: Number, min: 1 },
    monthlyFee: { type: Number, required: true, min: 0 },
    stops: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

transportRouteSchema.index({ orgId: 1, branchId: 1 });
transportRouteSchema.index({ orgId: 1, branchId: 1, name: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
transportRouteSchema.plugin(tenantPlugin);

export const TransportRoute = model<ITransportRoute>('TransportRoute', transportRouteSchema);
