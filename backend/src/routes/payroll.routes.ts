import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getSummary, getYtd, getTaxDeclaration } from '../controllers/payroll.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/ytd', getYtd);
router.get('/tax-declaration', getTaxDeclaration);

export default router;
