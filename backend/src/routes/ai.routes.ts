import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { chat, taxSimulation, investmentChecklist } from '../controllers/ai.controller';

const router = Router();

router.use(authenticate);

router.post('/chat', chat);
router.post('/tax-simulation', taxSimulation);
router.get('/investment-checklist', investmentChecklist);

export default router;
