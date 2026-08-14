import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  createBranch,
  createBranchValidators,
  listBranches,
  getBranch,
  updateBranch,
  deleteBranch,
  getBranchStats,
  getOrganizationSummary,
} from '../controllers/branchController';

const router = Router();

router.use(authenticate);

router.post('/', authorize('branch_management', 'create'), createBranchValidators, createBranch);
router.get('/summary', authorize('branch_management', 'read'), getOrganizationSummary);
router.get('/stats', authorize('branch_management', 'read'), getBranchStats);
router.get('/', authorize('branch_management', 'read'), listBranches);
router.get('/:id', authorize('branch_management', 'read'), getBranch);
router.put('/:id', authorize('branch_management', 'update'), updateBranch);
router.delete('/:id', authorize('branch_management', 'delete'), deleteBranch);

export default router;
