import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listDiscountPolicies, createDiscountPolicy, discountPolicyValidators,
  updateDiscountPolicy, deleteDiscountPolicy, applyDiscountPolicies,
} from '../controllers/discountPolicyController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('fee_management', 'read'), listDiscountPolicies);
router.post('/', authorize('fee_management', 'configure'), discountPolicyValidators, createDiscountPolicy);
router.put('/:id', authorize('fee_management', 'configure'), updateDiscountPolicy);
router.delete('/:id', authorize('fee_management', 'configure'), deleteDiscountPolicy);
router.post('/apply', authorize('fee_management', 'configure'), applyDiscountPolicies);

export default router;
