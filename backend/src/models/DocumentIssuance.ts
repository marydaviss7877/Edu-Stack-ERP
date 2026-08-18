import { Schema, model, Document, Types } from 'mongoose';
import type { TemplateKind, CertificateDocType } from './DocumentTemplate';

export type IssuanceStatus = 'issued' | 'revoked';
export type SubjectType = 'student' | 'user';

export interface IDocumentIssuance extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  templateId: Types.ObjectId;
  kind: TemplateKind;
  documentType?: CertificateDocType;
  subjectType: SubjectType;
  subjectId: Types.ObjectId;
  subjectName: string;
  serialNo: string;
  verificationCode: string;
  status: IssuanceStatus;
  // Field values as rendered at issuance time — kept so the record stays accurate
  // even if the student/staff profile changes later.
  dataSnapshot: Record<string, string>;
  issuedBy: Types.ObjectId;
  issuedAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
  revokedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentIssuanceSchema = new Schema<IDocumentIssuance>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'DocumentTemplate', required: true },
    kind: { type: String, enum: ['id_card_student', 'id_card_staff', 'certificate'], required: true },
    documentType: { type: String, enum: ['offer_letter', 'transfer_certificate', 'character_certificate', 'experience_letter', 'clearance_letter', 'custom'] },
    subjectType: { type: String, enum: ['student', 'user'], required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true },
    subjectName: { type: String, required: true },
    serialNo: { type: String, required: true },
    verificationCode: { type: String, required: true },
    status: { type: String, enum: ['issued', 'revoked'], default: 'issued' },
    dataSnapshot: { type: Schema.Types.Mixed, default: {} },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issuedAt: { type: Date, default: Date.now },
    revokedAt: Date,
    revokedReason: String,
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

documentIssuanceSchema.index({ orgId: 1, branchId: 1, kind: 1, issuedAt: -1 });
documentIssuanceSchema.index({ orgId: 1, subjectType: 1, subjectId: 1 });
documentIssuanceSchema.index({ orgId: 1, verificationCode: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
documentIssuanceSchema.plugin(tenantPlugin);

export const DocumentIssuance = model<IDocumentIssuance>('DocumentIssuance', documentIssuanceSchema);
