import { Schema, model, Document, Types } from 'mongoose';

export type StudentStatus = 'applied' | 'enrolled' | 'active' | 'leaving' | 'graduated' | 'transferred' | 'withdrawn';
export type Gender = 'male' | 'female' | 'other';

export interface IStudent extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  userId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  rollNo: string;
  admissionNo: string;
  houseId?: Types.ObjectId;
  labelIds: Types.ObjectId[];
  profile: {
    name: string;
    dateOfBirth: Date;
    gender: Gender;
    cnicOrBForm: string;
    religion?: string;
    nationality?: string;
    bloodGroup?: string;
    photoUrl?: string;
    address?: string;
  };
  guardianInfo: {
    fatherName: string;
    fatherCnic?: string;
    fatherPhone: string;
    fatherOccupation?: string;
    motherName?: string;
    motherPhone?: string;
    emergencyContact?: string;
    relation?: string;
  };
  documents: {
    type: string;
    url: string;
    uploadedAt: Date;
  }[];
  status: StudentStatus;
  previousSchool?: string;
  monthlyFee?: number;
  transport?: {
    routeId: Types.ObjectId;
    stopName?: string;
    monthlyFee?: number; // per-student override; falls back to the route's monthlyFee
  };
  admissionDate: Date;
  leavingInfo?: {
    initiatedAt: Date;
    initiatedByName: string;
    reason: string;
    financeCleared: boolean;
    financeClearedAt?: Date;
    tcIssuedAt?: Date;
    charCertIssuedAt?: Date;
    leftAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    rollNo: { type: String, required: true },
    admissionNo: { type: String, required: true },
    houseId: { type: Schema.Types.ObjectId, ref: 'House' },
    labelIds: { type: [Schema.Types.ObjectId], ref: 'Label', default: [] },
    profile: {
      name: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      gender: { type: String, enum: ['male', 'female', 'other'], required: true },
      cnicOrBForm: { type: String, required: true },
      religion: String,
      nationality: { type: String, default: 'Pakistani' },
      bloodGroup: String,
      photoUrl: String,
      address: String,
    },
    guardianInfo: {
      fatherName: { type: String, required: true },
      fatherCnic: String,
      fatherPhone: { type: String, required: true },
      fatherOccupation: String,
      motherName: String,
      motherPhone: String,
      emergencyContact: String,
      relation: String,
    },
    documents: [
      {
        type: { type: String },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['applied', 'enrolled', 'active', 'leaving', 'graduated', 'transferred', 'withdrawn'],
      default: 'applied',
    },
    previousSchool: String,
    monthlyFee: { type: Number, min: 0 },
    transport: {
      routeId: { type: Schema.Types.ObjectId, ref: 'TransportRoute' },
      stopName: String,
      monthlyFee: { type: Number, min: 0 },
    },
    admissionDate: { type: Date, default: Date.now },
    leavingInfo: {
      initiatedAt:       Date,
      initiatedByName:   String,
      reason:            String,
      financeCleared:    { type: Boolean, default: false },
      financeClearedAt:  Date,
      tcIssuedAt:        Date,
      charCertIssuedAt:  Date,
      leftAt:            Date,
    },
  },
  { timestamps: true }
);

studentSchema.index({ orgId: 1, branchId: 1 });
studentSchema.index({ orgId: 1, branchId: 1, classId: 1, sectionId: 1 });
studentSchema.index({ orgId: 1, branchId: 1, classId: 1, sectionId: 1, rollNo: 1 }, { unique: true });
studentSchema.index({ orgId: 1, branchId: 1, status: 1 });
studentSchema.index({ orgId: 1, admissionNo: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
studentSchema.plugin(tenantPlugin);

export const Student = model<IStudent>('Student', studentSchema);
