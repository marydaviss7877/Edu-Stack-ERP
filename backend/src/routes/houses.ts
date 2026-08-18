import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import { listHouses, createHouse, updateHouse, deleteHouse, houseValidators } from '../controllers/houseController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('houses', 'read'), listHouses);
router.post('/', authorize('houses', 'create'), houseValidators, createHouse);
router.put('/:id', authorize('houses', 'update'), updateHouse);
router.delete('/:id', authorize('houses', 'delete'), deleteHouse);

export default router;
