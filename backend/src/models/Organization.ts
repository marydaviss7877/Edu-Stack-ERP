import { Schema, model, Document, Types } from 'mongoose';

export type OrgPlan = 'starter' | 'growth' | 'scale';
export type OrgStatus = 'active' | 'suspended' | 'trial';

export interface ISiteNewsPost { id: string; title: string; body: string; date: string; }

export interface ISiteConfig {
  published: boolean;
  templateId?: 'classic' | 'modern' | 'minimal';
  hero:        { enabled: boolean; headline: string; subtext: string; ctaText: string; imageUrl?: string };
  about:       { enabled: boolean; body: string; founded: string; principalName: string; principalQuote: string; vision: string; mission: string };
  stats:       { enabled: boolean; items: { label: string; value: string }[] };
  admissions:  { enabled: boolean; body: string; criteria: string; process: string };
  contact:     { enabled: boolean; address: string; phone: string; email: string; mapUrl: string };
  news:        { enabled: boolean; posts: ISiteNewsPost[] };
  policies:    { enabled: boolean; privacy: string; conduct: string };
}

export interface IOrganization extends Document {
  name: string;
  slug: string;
  plan: OrgPlan;
  status: OrgStatus;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  logoUrl?: string;
  welcomeMessage?: string;
  tagline?: string;
  primaryColor?: string;
  websiteAddon?: boolean;
  peerFeedbackAddon?: boolean;
  site?: ISiteConfig;
  settings: {
    timezone: string;
    currency: string;
    academicYearStart: number; // month index 0-11
    primaryColor: string;
  };
  mobile: {
    enabled: boolean;
    qrSecret?: string;
  };
  usageBilling: {
    activeStudents: number;
    lastCountedAt?: Date;
    billingEmail?: string;
  };
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan: { type: String, enum: ['starter', 'growth', 'scale'], default: 'starter' },
    status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'trial' },
    contactEmail: { type: String, required: true, lowercase: true },
    contactPhone: String,
    address: String,
    logoUrl: String,
    welcomeMessage: { type: String, trim: true },
    tagline: { type: String, trim: true },
    primaryColor: { type: String, default: '#2563eb' },
    websiteAddon: { type: Boolean, default: false },
    peerFeedbackAddon: { type: Boolean, default: false },
    site: {
      published:   { type: Boolean, default: false },
      templateId:  { type: String, enum: ['classic', 'modern', 'minimal'] },
      hero:        { enabled: Boolean, headline: String, subtext: String, ctaText: String, imageUrl: String },
      about:      { enabled: Boolean, body: String, founded: String, principalName: String, principalQuote: String, vision: String, mission: String },
      stats:      { enabled: Boolean, items: [{ label: String, value: String, _id: false }] },
      admissions: { enabled: Boolean, body: String, criteria: String, process: String },
      contact:    { enabled: Boolean, address: String, phone: String, email: String, mapUrl: String },
      news:       { enabled: Boolean, posts: [{ id: String, title: String, body: String, date: String, _id: false }] },
      policies:   { enabled: Boolean, privacy: String, conduct: String },
    },
    settings: {
      timezone: { type: String, default: 'Asia/Karachi' },
      currency: { type: String, default: 'PKR' },
      academicYearStart: { type: Number, default: 3 }, // April
      primaryColor: { type: String, default: '#1e3a5f' }, // Navy Blue
    },
    mobile: {
      enabled: { type: Boolean, default: true },
      qrSecret: { type: String },
    },
    usageBilling: {
      activeStudents: { type: Number, default: 0 },
      lastCountedAt: Date,
      billingEmail: String,
    },
    trialEndsAt: Date,
  },
  { timestamps: true }
);

organizationSchema.index({ status: 1 });

export const Organization = model<IOrganization>('Organization', organizationSchema);
