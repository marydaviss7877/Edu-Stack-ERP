import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import { listSellableItems, listSales, getDailySummary, checkout, voidSale } from '../controllers/posController';

const router = Router();
router.use(authenticate);

router.get('/products', authorize('pos', 'read'), listSellableItems);
router.get('/sales', authorize('pos', 'read'), listSales);
router.get('/summary', authorize('pos', 'read'), getDailySummary);
router.post('/checkout', authorize('pos', 'create'), checkout);
router.post('/sales/:id/void', authorize('pos', 'update'), voidSale);

export default router;
