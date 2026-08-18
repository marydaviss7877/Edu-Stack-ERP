import { Schema, model, Document, Types } from 'mongoose';

// One shared visual-designer engine backs student ID cards, staff ID cards, and
// letters/certificates — they differ only in page size and which placeholder
// fields make sense, not in how elements are stored or rendered.
export type TemplateKind = 'id_card_student' | 'id_card_staff' | 'certificate';
export type CertificateDocType = 'offer_letter' | 'transfer_certificate' | 'character_certificate' | 'experience_letter' | 'clearance_letter' | 'custom';
export type ElementType = 'text' | 'field' | 'image' | 'qr' | 'rect';

export interface ITemplateElement {
  id: string;
  type: ElementType;
  x: number; // mm from left
  y: number; // mm from top
  width: number; // mm
  height: number; // mm
  rotation?: number;
  text?: string; // literal text (type='text')
  field?: string; // placeholder token, e.g. "student.name" (type='field' | 'qr')
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  src?: string; // image URL (type='image')
  fit?: 'cover' | 'contain';
  fill?: string; // type='rect'
  stroke?: string;
  radius?: number;
  opacity?: number;
}

export interface IDocumentTemplate extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  kind: TemplateKind;
  documentType?: CertificateDocType;
  name: string;
  isDefault: boolean;
  page: {
    width: number; // mm
    height: number; // mm
    orientation: 'portrait' | 'landscape';
    background?: string; // hex color
    backgroundImageUrl?: string;
  };
  elements: ITemplateElement[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const elementSchema = new Schema<ITemplateElement>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['text', 'field', 'image', 'qr', 'rect'], required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    rotation: Number,
    text: String,
    field: String,
    fontSize: Number,
    fontWeight: { type: String, enum: ['normal', 'bold'] },
    fontStyle: { type: String, enum: ['normal', 'italic'] },
    color: String,
    align: { type: String, enum: ['left', 'center', 'right'] },
    lineHeight: Number,
    src: String,
    fit: { type: String, enum: ['cover', 'contain'] },
    fill: String,
    stroke: String,
    radius: Number,
    opacity: Number,
  },
  { _id: false }
);

const documentTemplateSchema = new Schema<IDocumentTemplate>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    kind: { type: String, enum: ['id_card_student', 'id_card_staff', 'certificate'], required: true },
    documentType: { type: String, enum: ['offer_letter', 'transfer_certificate', 'character_certificate', 'experience_letter', 'clearance_letter', 'custom'] },
    name: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    page: {
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      orientation: { type: String, enum: ['portrait', 'landscape'], required: true },
      background: { type: String, default: '#ffffff' },
      backgroundImageUrl: String,
    },
    elements: { type: [elementSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

documentTemplateSchema.index({ orgId: 1, branchId: 1, kind: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
documentTemplateSchema.plugin(tenantPlugin);

export const DocumentTemplate = model<IDocumentTemplate>('DocumentTemplate', documentTemplateSchema);
