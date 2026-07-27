import api from './api';
import type { AuthUser, ApiResponse, PublicSiteData } from '../types';

interface LoginResponse {
  user: AuthUser;
  mustChangePassword?: boolean;
}

export async function login(
  email: string,
  password: string,
  slug?: string,
  loginAs?: 'admin' | 'teacher' | 'student',
): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
    email,
    password,
    ...(slug ? { slug } : {}),
    ...(loginAs ? { loginAs } : {}),
  });
  if (!data.success || !data.data) throw new Error(data.message ?? 'Login failed');
  if (data.data.mustChangePassword) throw new Error('PASSWORD_CHANGE_REQUIRED');
  return data.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout').catch(() => {});
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<ApiResponse<AuthUser>>('/auth/me');
  if (!data.success || !data.data) throw new Error('Failed to get user');
  return data.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put('/auth/change-password', { currentPassword, newPassword });
}

export async function verifyEmail(code: string): Promise<{ emailVerifiedAt: string }> {
  const { data } = await api.post<ApiResponse<{ emailVerifiedAt: string }>>('/auth/verify-email', { code });
  if (!data.success || !data.data) throw new Error(data.message ?? 'Verification failed');
  return data.data;
}

export async function resendVerification(): Promise<void> {
  await api.post('/auth/resend-verification');
}

export interface OrgBranding {
  name: string;
  slug: string;
  logoUrl: string | null;
  welcomeMessage: string | null;
  tagline: string | null;
  primaryColor: string | null;
}

export async function getSchoolSite(slug: string): Promise<PublicSiteData | null> {
  try {
    const { data } = await api.get<{ success: boolean; data: PublicSiteData }>(`/public/orgs/${slug}/site`);
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export async function getOrgBranding(slug: string): Promise<OrgBranding | null> {
  try {
    const { data } = await api.get<{ success: boolean; data: OrgBranding }>(`/public/orgs/${slug}`);
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}
