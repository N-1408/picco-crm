import { Router } from 'express';
import authRoutes from './authRoutes.js';
import agentRoutes from './agentRoutes.js';
import adminRoutes from './adminRoutes.js';
import statsRoutes from './statsRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/agent', agentRoutes);
router.use('/admin', adminRoutes);
router.use('/stats', statsRoutes);

export default router;
