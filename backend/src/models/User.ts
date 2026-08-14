import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole =
  | 'super_admin'
  | 'group_admin'
  | 'branch_principal'
  | 'coordinator'
  | 'teacher'
  | 'student'
  | 'accountant'
  | 'it_admin';

export interface IUser extends Document {
  orgId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  role: UserRole;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  photoUrl?: string;
  active: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  mustChangePassword: boolean;
  fcmTokens: string[];
  emailVerifiedAt?: Date;
  verification?: {
    codeHash?: string;
    expiresAt?: Date;
    attempts: number;
    lastSentAt?: Date;
  };
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    role: {
      type: String,
      enum: ['super_admin', 'group_admin', 'branch_principal', 'coordinator', 'teacher', 'student', 'accountant', 'it_admin'],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: String,
    photoUrl: String,
    active: { type: Boolean, default: true },
    lastLoginAt: Date,
    passwordChangedAt: Date,
    mustChangePassword: { type: Boolean, default: false },
    fcmTokens: { type: [String], default: [] },
    emailVerifiedAt: Date,
    verification: {
      codeHash: { type: String, select: false },
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
      lastSentAt: Date,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ orgId: 1, branchId: 1, role: 1 });
userSchema.index({ orgId: 1, active: 1 });

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

import { tenantPlugin } from '../utils/tenantPlugin';
userSchema.plugin(tenantPlugin);

export const User = model<IUser>('User', userSchema);
