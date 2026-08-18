import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  createCombinedAssessment, createCombinedAssessmentValidators, listCombinedAssessments,
  getCombinedAssessment, updateCombinedAssessment, deleteCombinedAssessment,
  publishCombinedAssessment, getCombinedResults,
} from '../controllers/combinedAssessmentController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('exams', 'read'), listCombinedAssessments);
router.post('/', authorize('exams', 'create'), createCombinedAssessmentValidators, createCombinedAssessment);
router.get('/:id', authorize('exams', 'read'), getCombinedAssessment);
router.put('/:id', authorize('exams', 'update'), updateCombinedAssessment);
router.delete('/:id', authorize('exams', 'delete'), deleteCombinedAssessment);
router.post('/:id/publish', authorize('exams', 'update'), publishCombinedAssessment);
router.get('/:id/results', authorize('results', 'read'), getCombinedResults);

export default router;
