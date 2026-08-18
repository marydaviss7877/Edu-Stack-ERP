import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listClearances, initiateClearance, getClearanceStatus,
  updateClearanceChecklist, completeClearance,
} from '../controllers/staffClearanceController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('staff_clearance', 'read'), listClearances);
router.post('/', authorize('staff_clearance', 'create'), initiateClearance);
router.get('/:id', authorize('staff_clearance', 'read'), getClearanceStatus);
router.put('/:id', authorize('staff_clearance', 'update'), updateClearanceChecklist);
router.post('/:id/complete', authorize('staff_clearance', 'update'), completeClearance);

export default router;
