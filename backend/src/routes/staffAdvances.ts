import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import { listAdvances, createAdvance, createAdvanceValidators, updateAdvanceStatus } from '../controllers/staffAdvanceController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('staff_finance', 'read'), listAdvances);
router.post('/', authorize('staff_finance', 'create'), createAdvanceValidators, createAdvance);
router.post('/:id/:action', authorize('staff_finance', 'approve'), updateAdvanceStatus);

export default router;
