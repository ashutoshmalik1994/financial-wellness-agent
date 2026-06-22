import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import payrollRoutes from './routes/payroll.routes';
import payslipRoutes from './routes/payslip.routes';
import aiRoutes from './routes/ai.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter (100 req / 15 min per IP)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  })
);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Database + server bootstrap ───────────────────────────────────────────────
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/financial_wellness';

mongoose
  .connect(mongoUri)
  .then(async () => {
    logger.info('✅ MongoDB connected');
    // Auto-seed demo data
    const { seedDatabase } = await import('./utils/seed');
    await seedDatabase();
    app.listen(PORT, () => logger.info(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    logger.error('MongoDB connection failed', err);
    process.exit(1);
  });

export default app;
