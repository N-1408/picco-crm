import { Router } from 'express';
import { registerAgent, loginAdmin, getAgentByTelegram } from '../controllers/authController.js';

const router = Router();

router.post('/register', registerAgent);
router.post('/login', loginAdmin);
router.get('/agent/:telegramId', getAgentByTelegram);

export default router;
