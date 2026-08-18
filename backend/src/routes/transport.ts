import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listTransportRoutes, createTransportRoute, updateTransportRoute, deleteTransportRoute,
  transportRouteValidators,
} from '../controllers/transportController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('transport', 'read'), listTransportRoutes);
router.post('/', authorize('transport', 'create'), transportRouteValidators, createTransportRoute);
router.put('/:id', authorize('transport', 'update'), updateTransportRoute);
router.delete('/:id', authorize('transport', 'delete'), deleteTransportRoute);

export default router;
