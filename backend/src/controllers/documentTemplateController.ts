import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { DocumentTemplate } from '../models/DocumentTemplate';
import { getUploadUrl, getPublicUrl } from '../services/s3Service';

export const templateValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('kind').isIn(['id_card_student', 'id_card_staff', 'certificate']).withMessage('Invalid kind'),
  body('page.width').isFloat({ min: 10 }),
  body('page.height').isFloat({ min: 10 }),
  body('page.orientation').isIn(['portrait', 'landscape']),
  body('elements').isArray(),
];

export async function listTemplates(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { kind } = req.query;
  const filter: Record<string, unknown> = { orgId, branchId };
  if (kind) filter.kind = kind;

  const templates = await DocumentTemplate.find(filter).sort({ kind: 1, name: 1 }).lean();
  res.json({ success: true, data: templates });
}

export async function getTemplate(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const template = await DocumentTemplate.findOne({ _id: req.params.id, orgId, branchId }).lean();
  if (!template) { res.status(404).json({ success: false, message: 'Template not found' }); return; }
  res.json({ success: true, data: template });
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { name, kind, documentType, isDefault, page, elements } = req.body;

  if (isDefault) {
    await DocumentTemplate.updateMany({ orgId, branchId, kind }, { isDefault: false });
  }

  const template = await DocumentTemplate.create({
    orgId, branchId, kind, documentType, name, page, elements,
    isDefault: !!isDefault,
    createdBy: req.user!.id,
  });

  res.status(201).json({ success: true, data: template });
}

export async function updateTemplate(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const allowed = ['name', 'documentType', 'isDefault', 'page', 'elements'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const existing = await DocumentTemplate.findOne({ _id: req.params.id, orgId, branchId });
  if (!existing) { res.status(404).json({ success: false, message: 'Template not found' }); return; }

  if (update.isDefault === true) {
    await DocumentTemplate.updateMany({ orgId, branchId, kind: existing.kind, _id: { $ne: existing._id } }, { isDefault: false });
  }

  Object.assign(existing, update);
  await existing.save();
  res.json({ success: true, data: existing });
}

/** POST /api/document-templates/upload-url — presigned S3 URL for a template background/asset image */
export async function getTemplateUploadUrl(req: Request, res: Response): Promise<void> {
  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    res.status(400).json({ success: false, message: 'filename and contentType required' });
    return;
  }

  const { orgId } = req.user!;
  const result = await getUploadUrl(`document-templates/${orgId}`, filename, contentType);
  if (!result) {
    res.status(503).json({ success: false, message: 'File storage not configured' });
    return;
  }

  res.json({ success: true, data: { uploadUrl: result.uploadUrl, key: result.key, publicUrl: getPublicUrl(result.key) } });
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const template = await DocumentTemplate.findOneAndDelete({ _id: req.params.id, orgId, branchId });
  if (!template) { res.status(404).json({ success: false, message: 'Template not found' }); return; }
  res.json({ success: true, message: 'Template deleted' });
}
