import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  createExpense,
  createExpenseValidators,
  createInventoryItem,
  createInventoryItemValidators,
  createIncome,
  createIncomeValidators,
  createProcurement,
  createVendor,
  getFinanceSummary,
  getInventoryDashboard,
  getInventoryMetadata,
  inventoryTransactionValidators,
  listExpenses,
  listInventoryItems,
  listIncome,
  listInventoryTransactions,
  listProcurements,
  listVendors,
  recordInventoryTransaction,
  updateExpenseStatus,
  updateInventoryItem,
  updateProcurementStatus,
} from '../controllers/inventoryController';

const router = Router();
router.use(authenticate);

router.get('/metadata', authorize('inventory', 'read'), getInventoryMetadata);
router.get('/dashboard', authorize('inventory', 'read'), getInventoryDashboard);
router.get('/finance-summary', authorize('finance_dashboard', 'read'), getFinanceSummary);

router.get('/items', authorize('inventory', 'read'), listInventoryItems);
router.post('/items', authorize('inventory', 'create'), createInventoryItemValidators, createInventoryItem);
router.put('/items/:id', authorize('inventory', 'update'), updateInventoryItem);
router.get('/transactions', authorize('inventory', 'read'), listInventoryTransactions);
router.post('/items/:id/transactions', authorize('inventory', 'update'), inventoryTransactionValidators, recordInventoryTransaction);

router.get('/expenses', authorize('expense_management', 'read'), listExpenses);
router.post('/expenses', authorize('expense_management', 'create'), createExpenseValidators, createExpense);
router.post('/expenses/:id/:action', authorize('expense_management', 'update'), updateExpenseStatus);

router.get('/income', authorize('income_management', 'read'), listIncome);
router.post('/income', authorize('income_management', 'create'), createIncomeValidators, createIncome);

router.get('/vendors', authorize('procurement', 'read'), listVendors);
router.post('/vendors', authorize('procurement', 'create'), createVendor);
router.get('/procurements', authorize('procurement', 'read'), listProcurements);
router.post('/procurements', authorize('procurement', 'create'), createProcurement);
router.post('/procurements/:id/:action', authorize('procurement', 'update'), updateProcurementStatus);

export default router;
