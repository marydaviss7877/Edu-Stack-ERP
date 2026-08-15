import { Schema, model, Document, Types } from 'mongoose';
import { createHash } from 'crypto';
import type { UserRole } from './User';

export type BehaviourCategory = 'discipline' | 'academic' | 'social' | 'punctuality' | 'other';
export type BehaviourType = 'merit' | 'demerit';
export type BehaviourStatus = 'active' | 'retracted';

export interface IBehaviourRecord extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  category: BehaviourCategory;
  type: BehaviourType;
  points: number;
  title: string;
  notes?: string;
  authorId: Types.ObjectId;
  authorRole: UserRole;
  status: BehaviourStatus;
  retractedById?: Types.ObjectId;
  retractedAt?: Date;
  retractionReason?: string;
  prevHash: string;
  recordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const behaviourRecordSchema = new Schema<IBehaviourRecord>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    category: { type: String, enum: ['discipline', 'academic', 'social', 'punctuality', 'other'], required: true },
    type: { type: String, enum: ['merit', 'demerit'], required: true },
    points: { type: Number, required: true, min: 1, max: 20 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 1000 },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorRole: { type: String, required: true },
    status: { type: String, enum: ['active', 'retracted'], default: 'active' },
    retractedById: { type: Schema.Types.ObjectId, ref: 'User' },
    retractedAt: Date,
    retractionReason: { type: String, trim: true, maxlength: 500 },
    prevHash: { type: String, required: true },
    recordHash: { type: String, required: true },
  },
  { timestamps: true }
);

behaviourRecordSchema.index({ orgId: 1, branchId: 1, studentId: 1, createdAt: 1 });
behaviourRecordSchema.index({ orgId: 1, branchId: 1, classId: 1, sectionId: 1 });
behaviourRecordSchema.index({ orgId: 1, authorId: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
behaviourRecordSchema.plugin(tenantPlugin);

export const BehaviourRecord = model<IBehaviourRecord>('BehaviourRecord', behaviourRecordSchema);

export const GENESIS_HASH = 'genesis';

/**
 * Chains each student's records into a tamper-evident sequence — not a literal blockchain,
 * just the same core guarantee (silently editing a past record breaks every hash after it),
 * built with the crypto module already used elsewhere in this backend rather than new infra.
 */
export function computeRecordHash(
  prevHash: string,
  fields: {
    studentId: string;
    category: BehaviourCategory;
    type: BehaviourType;
    points: number;
    title: string;
    notes?: string;
    authorId: string;
    createdAt: string;
  }
): string {
  const canonical = JSON.stringify({
    prevHash,
    studentId: fields.studentId,
    category: fields.category,
    type: fields.type,
    points: fields.points,
    title: fields.title,
    notes: fields.notes ?? '',
    authorId: fields.authorId,
    createdAt: fields.createdAt,
  });
  return createHash('sha256').update(canonical).digest('hex');
}
