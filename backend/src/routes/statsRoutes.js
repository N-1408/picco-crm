import { Router } from 'express';
import { getAdminStats, exportStats, getAgentStats } from '../controllers/statsController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/agent/:userId', getAgentStats);
router.get('/admin', requireAdmin, getAdminStats);
router.get('/export', requireAdmin, exportStats);

export default router;
