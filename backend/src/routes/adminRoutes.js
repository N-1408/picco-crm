import { Router } from 'express';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createStoreAdmin,
  listStores,
  updateStore,
  deleteStore,
  listAgents,
  addAdmin,
  changePassword,
  resetDatabase
} from '../controllers/adminController.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAdmin);

router.get('/products', listProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

router.get('/stores', listStores);
router.post('/stores', createStoreAdmin);
router.put('/stores/:id', updateStore);
router.delete('/stores/:id', deleteStore);

router.get('/agents', listAgents);

router.post('/admins/add', requireSuperAdmin, addAdmin);
router.put('/admins/change-password', changePassword);
router.delete('/reset', requireSuperAdmin, resetDatabase);

export default router;
