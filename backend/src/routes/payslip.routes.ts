import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { uploadPayslip, listPayslips, getPayslip } from '../controllers/payslip.controller';

const router = Router();

router.use(authenticate);

router.post('/upload', uploadMiddleware, uploadPayslip);
router.get('/', listPayslips);
router.get('/:id', getPayslip);

export default router;
