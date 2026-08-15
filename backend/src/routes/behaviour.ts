import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import { requireRoles } from '../middleware/rbac/authorize';
import {
  createBehaviourRecord,
  createBehaviourRecordValidators,
  listBehaviourRecords,
  getBehaviourSummary,
  retractBehaviourRecord,
  retractBehaviourRecordValidators,
  verifyBehaviourChain,
} from '../controllers/behaviourController';

const router = Router();
router.use(authenticate);

router.get('/summary', authorize('behaviour', 'read'), getBehaviourSummary);
router.get('/verify/:studentId', requireRoles('branch_principal', 'group_admin', 'super_admin'), verifyBehaviourChain);

router.get('/', authorize('behaviour', 'read'), listBehaviourRecords);
router.post('/', authorize('behaviour', 'create'), createBehaviourRecordValidators, createBehaviourRecord);
router.post('/:id/retract', requireRoles('branch_principal', 'group_admin'), retractBehaviourRecordValidators, retractBehaviourRecord);

export default router;
