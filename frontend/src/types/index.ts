export type UserRole =
  | 'super_admin'
  | 'group_admin'
  | 'branch_principal'
  | 'coordinator'
  | 'teacher'
  | 'student'
  | 'accountant'
  | 'it_admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgId?: string;
  branchId?: string;
  profilePhotoUrl?: string;
  emailVerifiedAt?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: { msg: string; path: string }[];
  meta?: { total: number; page: number; limit?: number; unreadCount?: number };
}

export interface SiteNewsPost { id: string; title: string; body: string; date: string; }

export interface SiteConfig {
  published: boolean;
  templateId?: 'classic' | 'modern' | 'minimal';
  hero:        { enabled: boolean; headline: string; subtext: string; ctaText: string; imageUrl?: string };
  about:       { enabled: boolean; body: string; founded: string; principalName: string; principalQuote: string; vision: string; mission: string };
  stats:       { enabled: boolean; items: { label: string; value: string }[] };
  admissions:  { enabled: boolean; body: string; criteria: string; process: string };
  contact:     { enabled: boolean; address: string; phone: string; email: string; mapUrl: string };
  news:        { enabled: boolean; posts: SiteNewsPost[] };
  policies:    { enabled: boolean; privacy: string; conduct: string };
}

export interface PublicSiteData extends SiteConfig {
  orgName: string;
  slug: string;
  logoUrl: string | null;
  tagline: string | null;
  primaryColor: string | null;
  welcomeMessage: string | null;
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'growth' | 'scale';
  status: 'active' | 'suspended' | 'trial';
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  logoUrl?: string;
  welcomeMessage?: string;
  tagline?: string;
  primaryColor?: string;
  websiteAddon?: boolean;
  site?: SiteConfig;
  usageBilling: { activeStudents: number; lastCountedAt?: string };
  trialEndsAt?: string;
  createdAt: string;
}

export interface Branch {
  _id: string;
  orgId: string;
  name: string;
  code: string;
  address: string;
  city: string;
  status: 'active' | 'inactive';
  settings: {
    attendanceThreshold: number;
    periodsPerDay: number;
    workingDays: number[];
  };
}

export type ResourceType = 'notes' | 'book' | 'past_paper' | 'video_link' | 'other';

export interface LearningResource {
  _id: string;
  orgId: string;
  branchId: string;
  classId: { _id: string; name: string; level: string } | string;
  subjectId?: { _id: string; name: string; code: string } | string;
  uploadedBy: { _id: string; name: string } | string;
  title: string;
  description?: string;
  type: ResourceType;
  fileUrl?: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  externalUrl?: string;
  tags: string[];
  isPublished: boolean;
  isBookmarked?: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  orgId?: string;
  branchId?: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  active: boolean;
  profilePhotoUrl?: string;
}
