import { Schema, model, Document, Types } from 'mongoose';

export interface IPeerFeedbackAnswer {
  questionId: Types.ObjectId;
  value: number;
}

export interface IPeerFeedbackResponse extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  cycleId: Types.ObjectId;
  targetStudentId: Types.ObjectId;
  // Stored for de-duplication and abuse investigation only — no controller in this app
  // ever returns this field. Individual responses are never readable, only aggregated.
  respondentStudentId: Types.ObjectId;
  answers: IPeerFeedbackAnswer[];
  createdAt: Date;
}

const peerFeedbackResponseSchema = new Schema<IPeerFeedbackResponse>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'PeerFeedbackCycle', required: true },
    targetStudentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    respondentStudentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: 'PeerFeedbackQuestion', required: true },
        value: { type: Number, required: true, min: 1, max: 5 },
        _id: false,
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

peerFeedbackResponseSchema.index({ cycleId: 1, targetStudentId: 1, respondentStudentId: 1 }, { unique: true });
peerFeedbackResponseSchema.index({ orgId: 1, branchId: 1, targetStudentId: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
peerFeedbackResponseSchema.plugin(tenantPlugin);

export const PeerFeedbackResponse = model<IPeerFeedbackResponse>('PeerFeedbackResponse', peerFeedbackResponseSchema);
