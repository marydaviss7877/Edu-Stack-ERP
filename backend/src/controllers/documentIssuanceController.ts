import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { DocumentIssuance } from '../models/DocumentIssuance';
import { Sequence } from '../models/Sequence';
import type { TemplateKind, CertificateDocType } from '../models/DocumentTemplate';

const SERIAL_PREFIX: Record<TemplateKind, string> = {
  id_card_student: 'SID',
  id_card_staff: 'FID',
  certificate: 'DOC',
};

async function nextSerial(orgId: string, kind: TemplateKind): Promise<string> {
  const year = new Date().getFullYear();
  const key = `doc-issuance:${kind}:${year}`;
  const seq = await Sequence.findOneAndUpdate(
    { orgId, key },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  return `${SERIAL_PREFIX[kind]}-${year}-${String(seq!.value).padStart(5, '0')}`;
}

function newVerificationCode(): string {
  return randomBytes(9).toString('base64url'); // 12 url-safe chars
}

interface IssuanceInput {
  templateId: string;
  kind: TemplateKind;
  documentType?: CertificateDocType;
  subjectType: 'student' | 'user';
  subjectId: string;
  subjectName: string;
  dataSnapshot?: Record<string, string>;
}

function validateInput(body: unknown): body is IssuanceInput {
  const b = body as Partial<IssuanceInput>;
  return !!(b && b.templateId && b.kind && b.subjectType && b.subjectId && b.subjectName);
}

export async function listIssuances(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, role, id: userId } = req.user!;
  const { kind, status, subjectType, subjectId } = req.query;

  const filter: Record<string, unknown> = { orgId, branchId };
  if (kind) filter.kind = kind;
  if (status) filter.status = status;
  if (subjectType) filter.subjectType = subjectType;
  if (subjectId) filter.subjectId = subjectId;

  // Students and teachers see only documents issued to them; admin roles see the full branch log.
  if (role === 'student') { filter.subjectType = 'student'; filter.subjectId = userId; }
  if (role === 'teacher') { filter.subjectType = 'user'; filter.subjectId = userId; }

  const issuances = await DocumentIssuance.find(filter).sort({ issuedAt: -1 }).limit(1000).lean();
  res.json({ success: true, data: issuances });
}

export async function createIssuance(req: Request, res: Response): Promise<void> {
  if (!validateInput(req.body)) {
    res.status(422).json({ success: false, message: 'templateId, kind, subjectType, subjectId and subjectName are required' });
    return;
  }
  const { orgId, branchId } = req.user!;
  const { templateId, kind, documentType, subjectType, subjectId, subjectName, dataSnapshot } = req.body as IssuanceInput;

  const [serialNo, verificationCode] = await Promise.all([
    nextSerial(orgId!, kind),
    Promise.resolve(newVerificationCode()),
  ]);

  const issuance = await DocumentIssuance.create({
    orgId, branchId, templateId, kind, documentType, subjectType, subjectId, subjectName,
    serialNo, verificationCode, status: 'issued',
    dataSnapshot: dataSnapshot ?? {},
    issuedBy: req.user!.id,
    issuedAt: new Date(),
  });

  res.status(201).json({ success: true, data: issuance });
}

export async function createIssuanceBulk(req: Request, res: Response): Promise<void> {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0 || !items.every(validateInput)) {
    res.status(422).json({ success: false, message: 'items[] with templateId, kind, subjectType, subjectId, subjectName is required' });
    return;
  }
  const { orgId, branchId } = req.user!;

  const created = [];
  for (const item of items as IssuanceInput[]) {
    const serialNo = await nextSerial(orgId!, item.kind);
    const verificationCode = newVerificationCode();
    const issuance = await DocumentIssuance.create({
      orgId, branchId, templateId: item.templateId, kind: item.kind, documentType: item.documentType,
      subjectType: item.subjectType, subjectId: item.subjectId, subjectName: item.subjectName,
      serialNo, verificationCode, status: 'issued',
      dataSnapshot: item.dataSnapshot ?? {},
      issuedBy: req.user!.id,
      issuedAt: new Date(),
    });
    created.push(issuance);
  }

  res.status(201).json({ success: true, data: created });
}

export async function revokeIssuance(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { reason } = req.body;

  const issuance = await DocumentIssuance.findOneAndUpdate(
    { _id: req.params.id, orgId, branchId },
    { status: 'revoked', revokedAt: new Date(), revokedReason: reason, revokedBy: req.user!.id },
    { new: true }
  );
  if (!issuance) { res.status(404).json({ success: false, message: 'Issuance not found' }); return; }
  res.json({ success: true, data: issuance });
}
