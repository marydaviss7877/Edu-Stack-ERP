import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import { listLabels, createLabel, updateLabel, deleteLabel, labelValidators } from '../controllers/labelController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('labels', 'read'), listLabels);
router.post('/', authorize('labels', 'create'), labelValidators, createLabel);
router.put('/:id', authorize('labels', 'update'), updateLabel);
router.delete('/:id', authorize('labels', 'delete'), deleteLabel);

export default router;
