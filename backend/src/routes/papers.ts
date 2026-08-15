import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  createPaper,
  createPaperValidators,
  listPapers,
  getPaper,
  enterPaperMarks,
  enterPaperMarksValidators,
  getPaperResults,
  getWeakTopics,
  getMonthlyWeakReport,
  getMyProgress,
} from '../controllers/paperController';

const router = Router();
router.use(authenticate);

router.get('/weak-topics', authorize('academic_intelligence', 'read'), getWeakTopics);
router.get('/monthly-report', authorize('academic_intelligence', 'read'), getMonthlyWeakReport);
router.get('/my-progress', authorize('academic_intelligence', 'read'), getMyProgress);

router.get('/', authorize('academic_intelligence', 'read'), listPapers);
router.post('/', authorize('academic_intelligence', 'create'), createPaperValidators, createPaper);
router.get('/:id', authorize('academic_intelligence', 'read'), getPaper);
router.get('/:id/results', authorize('academic_intelligence', 'read'), getPaperResults);
router.post('/:id/marks', authorize('academic_intelligence', 'mark'), enterPaperMarksValidators, enterPaperMarks);

export default router;
