import { Schema, model, Document, Types } from 'mongoose';

export type PeerFeedbackCategory = 'respectfulness' | 'teamwork' | 'honesty' | 'punctuality' | 'leadership' | 'kindness' | 'other';
export type PeerFeedbackScaleType = 'likert5';
export type PeerFeedbackQuestionSource = 'static' | 'ai';

export interface IPeerFeedbackQuestion extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  text: string;
  category: PeerFeedbackCategory;
  scaleType: PeerFeedbackScaleType;
  source: PeerFeedbackQuestionSource;
  contextTags?: string[];
  gradeLevel?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const peerFeedbackQuestionSchema = new Schema<IPeerFeedbackQuestion>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    text: { type: String, required: true, trim: true, maxlength: 240 },
    category: {
      type: String,
      enum: ['respectfulness', 'teamwork', 'honesty', 'punctuality', 'leadership', 'kindness', 'other'],
      required: true,
    },
    scaleType: { type: String, enum: ['likert5'], default: 'likert5' },
    source: { type: String, enum: ['static', 'ai'], default: 'static' },
    contextTags: [{ type: String }],
    gradeLevel: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

peerFeedbackQuestionSchema.index({ orgId: 1, branchId: 1, isActive: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
peerFeedbackQuestionSchema.plugin(tenantPlugin);

export const PeerFeedbackQuestion = model<IPeerFeedbackQuestion>('PeerFeedbackQuestion', peerFeedbackQuestionSchema);
