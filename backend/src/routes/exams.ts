import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  createExam, createExamValidators, listExams, getExam, updateExam,
  enterMarks, enterMarksValidators, publishExam, getResults, setResultRemarks,
} from '../controllers/examController';
import { getExamAnalytics, getExamProgress } from '../controllers/examAnalyticsController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('exams', 'read'), listExams);
router.post('/', authorize('exams', 'create'), createExamValidators, createExam);
router.get('/results', authorize('results', 'read'), getResults);
router.get('/progress', authorize('exams', 'read'), getExamProgress);
router.get('/:id', authorize('exams', 'read'), getExam);
router.put('/:id', authorize('exams', 'update'), updateExam);
router.get('/:id/analytics', authorize('exams', 'read'), getExamAnalytics);
router.post('/:examId/marks', authorize('results', 'mark'), enterMarksValidators, enterMarks);
router.patch('/:examId/results/:studentId/remarks', authorize('results', 'update'), setResultRemarks);
router.post('/:id/publish', authorize('exams', 'update'), publishExam);

export default router;
