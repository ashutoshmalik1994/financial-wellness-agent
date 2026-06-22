import { Request, Response, NextFunction } from 'express';
import { PayrollRecord } from '../models/payroll.model';
import { Types } from 'mongoose';
import { audit } from '../utils/audit.utils';
import { createError } from '../middleware/error.middleware';

export const getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const fy = (req.query.fy as string) || '2024-25';

    const record = await PayrollRecord.findOne({ userId, financialYear: fy });
    if (!record) {
      res.status(404).json({ error: 'No payroll record found for this financial year' });
      return;
    }

    await audit(req, 'PAYROLL_QUERY', record._id.toString(), { fy });

    res.json({
      financialYear: record.financialYear,
      annualCTC: record.annualCTC,
      monthlyCTC: Math.round(record.annualCTC / 12),
      monthlyBreakup: record.monthlyBreakup,
      regime: record.regime,
    });
  } catch (err) {
    next(err);
  }
};

export const getYtd = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const fy = (req.query.fy as string) || '2024-25';

    const record = await PayrollRecord.findOne({ userId, financialYear: fy });
    if (!record) {
      res.status(404).json({ error: 'No payroll record found' });
      return;
    }

    const ytdGross = record.monthlyBreakup.reduce((s, m) => s + m.grossPay, 0);
    const ytdNet = record.monthlyBreakup.reduce((s, m) => s + m.netPay, 0);
    const ytdTds = record.monthlyBreakup.reduce((s, m) => s + m.tds, 0);

    await audit(req, 'PAYROLL_QUERY', record._id.toString(), { type: 'ytd', fy });

    res.json({
      financialYear: fy,
      monthsProcessed: record.monthlyBreakup.length,
      ytdGross,
      ytdNetPay: ytdNet,
      ytdTds,
      taxDeclaration: record.taxDeclaration,
    });
  } catch (err) {
    next(err);
  }
};

export const getTaxDeclaration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const record = await PayrollRecord.findOne({ userId, financialYear: '2024-25' });
    if (!record) {
      res.status(404).json({ error: 'No payroll record found' });
      return;
    }
    res.json(record.taxDeclaration);
  } catch (err) {
    next(err);
  }
};
