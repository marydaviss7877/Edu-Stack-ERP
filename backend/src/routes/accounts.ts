import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listAccounts, createAccount, createAccountValidators, updateAccount, seedAccounts,
  listJournalEntries, createJournalEntry, createJournalEntryValidators,
  getTrialBalance, getAccountLedger,
} from '../controllers/accountsController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('accounting', 'read'), listAccounts);
router.post('/', authorize('accounting', 'create'), createAccountValidators, createAccount);
router.post('/seed-defaults', authorize('accounting', 'create'), seedAccounts);
router.put('/:id', authorize('accounting', 'update'), updateAccount);

router.get('/journal-entries', authorize('accounting', 'read'), listJournalEntries);
router.post('/journal-entries', authorize('accounting', 'create'), createJournalEntryValidators, createJournalEntry);

router.get('/trial-balance', authorize('accounting', 'read'), getTrialBalance);
router.get('/ledger/:accountId', authorize('accounting', 'read'), getAccountLedger);

export default router;
