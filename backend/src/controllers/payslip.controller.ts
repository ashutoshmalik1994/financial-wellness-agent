import { Request, Response, NextFunction } from 'express';
import { Payslip } from '../models/payslip.model';
import { ocrService } from '../services/ocr.service';
import { Types } from 'mongoose';
import { audit } from '../utils/audit.utils';
import { createError } from '../middleware/error.middleware';

export const uploadPayslip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with field name "payslip".' });
      return;
    }

    const userId = new Types.ObjectId(req.user!.userId);
    const month = req.body.month as string | undefined;

    // Run OCR
    const ocrResult = await ocrService.extractPayslip(req.file.buffer, req.file.originalname, month);

    // Upsert: if a payslip for this month already exists, update it
    const payslip = await Payslip.findOneAndUpdate(
      { userId, month: ocrResult.month },
      {
        userId,
        employeeId: req.user!.employeeId,
        month: ocrResult.month,
        fileName: req.file.originalname,
        ocrRaw: ocrResult.raw,
        fields: ocrResult.fields,
        ocrConfidence: ocrResult.confidence,
        missingFields: ocrResult.missingFields,
        uploadedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );

    await audit(req, 'PAYSLIP_UPLOAD', payslip._id.toString(), {
      month: ocrResult.month,
      fileName: req.file.originalname,
      ocrConfidence: ocrResult.confidence,
    });

    res.status(201).json({
      message: 'Payslip uploaded and processed successfully',
      payslipId: payslip._id,
      month: ocrResult.month,
      ocrConfidence: Math.round(ocrResult.confidence * 100),
      missingFields: ocrResult.missingFields,
      fields: ocrResult.fields,
    });
  } catch (err) {
    next(err);
  }
};

export const listPayslips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const payslips = await Payslip.find({ userId })
      .select('month fileName uploadedAt ocrConfidence missingFields fields.netPay fields.grossEarnings')
      .sort({ month: -1 });
    res.json(payslips);
  } catch (err) {
    next(err);
  }
};

export const getPayslip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const { id } = req.params;

    const payslip = await Payslip.findById(id);
    if (!payslip) {
      res.status(404).json({ error: 'Payslip not found' });
      return;
    }

    // ── Authorization: ensure the payslip belongs to the requesting user ──────
    if (!payslip.userId.equals(userId)) {
      await audit(req, 'UNAUTHORIZED_ACCESS_ATTEMPT', id);
      res.status(403).json({ error: 'Access denied. You can only view your own payslips.' });
      return;
    }

    await audit(req, 'PAYSLIP_VIEW', id);
    res.json(payslip);
  } catch (err) {
    next(err);
  }
};
