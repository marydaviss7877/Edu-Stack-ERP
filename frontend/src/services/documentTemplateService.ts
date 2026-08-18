import api from './api';
import type { ApiResponse } from '../types';

export type TemplateKind = 'id_card_student' | 'id_card_staff' | 'certificate';
export type CertificateDocType = 'offer_letter' | 'transfer_certificate' | 'character_certificate' | 'experience_letter' | 'clearance_letter' | 'custom';
export type ElementType = 'text' | 'field' | 'image' | 'qr' | 'rect';

export interface TemplateElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  text?: string;
  field?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  src?: string;
  fit?: 'cover' | 'contain';
  fill?: string;
  stroke?: string;
  radius?: number;
  opacity?: number;
}

export interface TemplatePage {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  background?: string;
  backgroundImageUrl?: string;
}

export interface DocumentTemplateDoc {
  _id: string;
  kind: TemplateKind;
  documentType?: CertificateDocType;
  name: string;
  isDefault: boolean;
  page: TemplatePage;
  elements: TemplateElement[];
  createdAt: string;
  updatedAt: string;
}

export const documentTemplateService = {
  list: (kind?: TemplateKind) => api.get<ApiResponse<DocumentTemplateDoc[]>>('/document-templates', { params: kind ? { kind } : undefined }).then(r => r.data.data ?? []),
  getUploadUrl: (filename: string, contentType: string) =>
    api.post<ApiResponse<{ uploadUrl: string; key: string; publicUrl: string }>>('/document-templates/upload-url', { filename, contentType }).then(r => r.data.data!),
  get: (id: string) => api.get<ApiResponse<DocumentTemplateDoc>>(`/document-templates/${id}`).then(r => r.data.data!),
  create: (d: Partial<DocumentTemplateDoc>) => api.post<ApiResponse<DocumentTemplateDoc>>('/document-templates', d).then(r => r.data.data!),
  update: (id: string, d: Partial<DocumentTemplateDoc>) => api.put<ApiResponse<DocumentTemplateDoc>>(`/document-templates/${id}`, d).then(r => r.data.data!),
  remove: (id: string) => api.delete(`/document-templates/${id}`),
};
