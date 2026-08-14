import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { requireSuperAdmin } from '../middleware/rbac/authorize';
import {
  createOrganization,
  createOrgValidators,
  listOrganizations,
  getOrganization,
  updateOrganization,
  updateSite,
  getUsageMetrics,
  getOwnUsageMetrics,
  getLogoUploadUrl,
  generateMobileQr,
  getMobileConfig,
  toggleMobileAccess,
  getOrgMobileUsers,
  revokeUserDevices,
} from '../controllers/organizationController';

const router = Router();

router.use(authenticate);

// Super-admin-only
router.post('/', requireSuperAdmin, createOrgValidators, createOrganization);
router.get('/', requireSuperAdmin, listOrganizations);
router.get('/usage-metrics', requireSuperAdmin, getUsageMetrics);

// Super-admin only — mobile configuration dashboard
router.get('/mobile-config', requireSuperAdmin, getMobileConfig);
router.patch('/:id/mobile-access', requireSuperAdmin, toggleMobileAccess);
router.get('/:id/mobile-users', requireSuperAdmin, getOrgMobileUsers);
router.delete('/:id/mobile-users/:userId/devices', requireSuperAdmin, revokeUserDevices);

// Super-admin OR group_admin for their own org (controller enforces scoping)
router.get('/:id', getOrganization);
router.put('/:id', updateOrganization);
router.put('/:id/site', updateSite);
router.post('/:id/upload-logo', getLogoUploadUrl);
router.get('/:id/usage-metrics', getOwnUsageMetrics);

// Group admin: generate printable QR for mobile onboarding
router.post('/:id/generate-qr', generateMobileQr);

export default router;
