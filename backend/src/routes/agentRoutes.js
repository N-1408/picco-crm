import { Router } from 'express';
import {
  createOrder,
  getAgentOrders,
  getAgentStores,
  listProducts,
  createStore,
  getAgentStats
} from '../controllers/agentController.js';

const router = Router();

router.post('/orders', createOrder);
router.get('/orders/:userId', getAgentOrders);
router.get('/stores/:agentId', getAgentStores);
router.get('/products', listProducts);
router.post('/stores', createStore);
router.get('/stats/:userId', getAgentStats);

export default router;
