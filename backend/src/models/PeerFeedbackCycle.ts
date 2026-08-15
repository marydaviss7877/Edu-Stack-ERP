import { Schema, model, Document, Types } from 'mongoose';

export type PeerFeedbackCycleStatus = 'open' | 'closed';

export interface IPeerFeedbackCycle extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  month: number;
  year: number;
  status: PeerFeedbackCycleStatus;
  questionIds: Types.ObjectId[];
  minResponsesForVisibility: number;
  createdAt: Date;
  updatedAt: Date;
}

const peerFeedbackCycleSchema = new Schema<IPeerFeedbackCycle>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    questionIds: [{ type: Schema.Types.ObjectId, ref: 'PeerFeedbackQuestion' }],
    minResponsesForVisibility: { type: Number, default: 5 },
  },
  { timestamps: true }
);

peerFeedbackCycleSchema.index({ orgId: 1, branchId: 1, classId: 1, sectionId: 1, month: 1, year: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
peerFeedbackCycleSchema.plugin(tenantPlugin);

export const PeerFeedbackCycle = model<IPeerFeedbackCycle>('PeerFeedbackCycle', peerFeedbackCycleSchema);
