import { Schema, model, Document, Types } from 'mongoose';
import { IGradeThreshold } from './Exam';

export interface ICombinedComponent {
  examId: Types.ObjectId;
  weight: number;
}

export interface ICombinedAssessment extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  name: string;
  classId: Types.ObjectId;
  sectionId?: Types.ObjectId;
  components: ICombinedComponent[];
  gradingConfig: IGradeThreshold[];
  isPublished: boolean;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const combinedComponentSchema = new Schema<ICombinedComponent>(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    weight: { type: Number, required: true, min: 0.01 },
  },
  { _id: false }
);

const combinedAssessmentSchema = new Schema<ICombinedAssessment>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    name: { type: String, required: true, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
    components: { type: [combinedComponentSchema], required: true, validate: (v: ICombinedComponent[]) => v.length >= 2 },
    gradingConfig: [
      {
        grade: { type: String, required: true },
        minPercentage: { type: Number, required: true },
        maxPercentage: { type: Number, required: true },
        remark: String,
      },
    ],
    isPublished: { type: Boolean, default: false },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

combinedAssessmentSchema.index({ orgId: 1, branchId: 1, academicYearId: 1, classId: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
combinedAssessmentSchema.plugin(tenantPlugin);

export const CombinedAssessment = model<ICombinedAssessment>('CombinedAssessment', combinedAssessmentSchema);
