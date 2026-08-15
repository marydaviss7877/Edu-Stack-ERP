import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  requirePeerFeedbackAddon,
  getMyCycle,
  submitResponse,
  submitResponseValidators,
  getSummary,
} from '../controllers/peerFeedbackController';

const router = Router();
router.use(authenticate, requirePeerFeedbackAddon);

router.get('/my-cycle', authorize('peer_feedback', 'read'), getMyCycle);
router.post('/respond', authorize('peer_feedback', 'create'), submitResponseValidators, submitResponse);
router.get('/summary', authorize('peer_feedback', 'read'), getSummary);

export default router;
