import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import { listIssuances, createIssuance, createIssuanceBulk, revokeIssuance } from '../controllers/documentIssuanceController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('document_issuance', 'read'), listIssuances);
router.post('/', authorize('document_issuance', 'create'), createIssuance);
router.post('/bulk', authorize('document_issuance', 'create'), createIssuanceBulk);
router.put('/:id/revoke', authorize('document_issuance', 'update'), revokeIssuance);

export default router;
