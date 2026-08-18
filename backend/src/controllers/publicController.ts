import { Request, Response } from 'express';
import { Organization } from '../models/Organization';
import { DocumentIssuance } from '../models/DocumentIssuance';

/** Public — no auth. Returns published school site if add-on is enabled. */
export async function getOrgSite(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.slug).toLowerCase();

  const org = await Organization.findOne({ slug })
    .select('name slug logoUrl tagline primaryColor welcomeMessage websiteAddon site status')
    .lean();

  if (!org || org.status === 'suspended' || !org.websiteAddon || !org.site?.published) {
    res.status(404).json({ success: false, message: 'Site not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      orgName: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl ?? null,
      tagline: org.tagline ?? null,
      primaryColor: org.primaryColor ?? null,
      welcomeMessage: org.welcomeMessage ?? null,
      ...org.site,
    },
  });
}

/** Public — no auth. Returns org branding for the login page. */
export async function getOrgBySlug(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.slug).toLowerCase();

  const org = await Organization.findOne({ slug })
    .select('name slug logoUrl welcomeMessage tagline primaryColor status')
    .lean();

  if (!org || org.status === 'suspended') {
    res.status(404).json({ success: false, message: 'School not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl ?? null,
      welcomeMessage: org.welcomeMessage ?? null,
      tagline: org.tagline ?? null,
      primaryColor: org.primaryColor ?? null,
    },
  });
}

const KIND_LABEL: Record<string, string> = {
  id_card_student: 'Student ID Card',
  id_card_staff: 'Staff ID Card',
  certificate: 'Certificate / Letter',
};

/** Public — no auth. Looks up a document by its QR/verification code across all schools. */
export async function verifyDocument(req: Request, res: Response): Promise<void> {
  const code = String(req.params.code || '').trim();
  if (!code) { res.status(400).json({ success: false, message: 'Verification code required' }); return; }

  const issuance = await DocumentIssuance.findOne({ verificationCode: code })
    .setOptions({ _skipTenantCheck: true })
    .populate('orgId', 'name logoUrl')
    .lean();

  if (!issuance) {
    res.status(404).json({ success: false, message: 'No document found for this code' });
    return;
  }

  const org = issuance.orgId as unknown as { name: string; logoUrl?: string };

  res.json({
    success: true,
    data: {
      valid: issuance.status === 'issued',
      status: issuance.status,
      kind: issuance.kind,
      kindLabel: KIND_LABEL[issuance.kind] ?? issuance.kind,
      documentType: issuance.documentType ?? null,
      subjectName: issuance.subjectName,
      serialNo: issuance.serialNo,
      issuedAt: issuance.issuedAt,
      revokedAt: issuance.revokedAt ?? null,
      revokedReason: issuance.revokedReason ?? null,
      orgName: org?.name ?? 'School',
      orgLogoUrl: org?.logoUrl ?? null,
    },
  });
}
