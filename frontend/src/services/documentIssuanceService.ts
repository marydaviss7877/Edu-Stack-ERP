import api from './api';
import type { ApiResponse } from '../types';
import type { TemplateKind, CertificateDocType } from './documentTemplateService';

export interface IssuanceInput {
  templateId: string;
  kind: TemplateKind;
  documentType?: CertificateDocType;
  subjectType: 'student' | 'user';
  subjectId: string;
  subjectName: string;
  dataSnapshot?: Record<string, string>;
}

export interface DocumentIssuanceDoc extends IssuanceInput {
  _id: string;
  serialNo: string;
  verificationCode: string;
  status: 'issued' | 'revoked';
  issuedAt: string;
  revokedAt?: string;
  revokedReason?: string;
}

export interface VerifyResult {
  valid: boolean;
  status: 'issued' | 'revoked';
  kind: TemplateKind;
  kindLabel: string;
  documentType: CertificateDocType | null;
  subjectName: string;
  serialNo: string;
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  orgName: string;
  orgLogoUrl: string | null;
}

export const documentIssuanceService = {
  verify: (code: string) => api.get<ApiResponse<VerifyResult>>(`/public/verify/${code}`).then(r => r.data.data!),
  list: (params?: { kind?: TemplateKind; status?: string; subjectType?: string; subjectId?: string }) =>
    api.get<ApiResponse<DocumentIssuanceDoc[]>>('/document-issuance', { params }).then(r => r.data.data ?? []),
  issue: (d: IssuanceInput) => api.post<ApiResponse<DocumentIssuanceDoc>>('/document-issuance', d).then(r => r.data.data!),
  issueBulk: (items: IssuanceInput[]) => api.post<ApiResponse<DocumentIssuanceDoc[]>>('/document-issuance/bulk', { items }).then(r => r.data.data ?? []),
  revoke: (id: string, reason: string) => api.put<ApiResponse<DocumentIssuanceDoc>>(`/document-issuance/${id}/revoke`, { reason }).then(r => r.data.data!),
};
