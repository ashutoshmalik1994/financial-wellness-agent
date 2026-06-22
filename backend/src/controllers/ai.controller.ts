import { Request, Response, NextFunction } from 'express';
import { Payslip } from '../models/payslip.model';
import { PayrollRecord } from '../models/payroll.model';
import { llmService, ChatMessage } from '../services/llm.service';
import { simulateTax, TaxSimulationInput } from '../utils/tax.utils';
import { Types } from 'mongoose';
import { audit } from '../utils/audit.utils';
import { v4 as uuidv4 } from 'uuid';

export const chat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const { question, month, history = [] } = req.body as {
      question: string;
      month?: string;
      history?: ChatMessage[];
    };

    if (!question?.trim()) {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    // Fetch most recent payslip (or specific month)
    const payslip = month
      ? await Payslip.findOne({ userId, month })
      : await Payslip.findOne({ userId }).sort({ month: -1 });

    const payrollRecord = await PayrollRecord.findOne({ userId, financialYear: '2024-25' });

    const traceId = uuidv4();
    const answer = await llmService.chat(
      question,
      payslip?.fields ?? null,
      payrollRecord?.taxDeclaration ?? null,
      history,
      traceId
    );

    await audit(req, 'AI_CHAT', undefined, { question: question.slice(0, 100), traceId });

    res.json({
      answer,
      traceId,
      dataSource: payslip ? `Payslip for ${payslip.month}` : 'No payslip data',
    });
  } catch (err) {
    next(err);
  }
};

export const taxSimulation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const body = req.body as Partial<TaxSimulationInput>;

    const payrollRecord = await PayrollRecord.findOne({ userId, financialYear: '2024-25' });
    const annualGross = body.annualGross ?? payrollRecord?.annualCTC ?? 0;

    if (!annualGross) {
      res.status(400).json({ error: 'annualGross is required or must exist in payroll records' });
      return;
    }

    const input: TaxSimulationInput = {
      annualGross,
      section80C: body.section80C ?? payrollRecord?.taxDeclaration.section80C ?? 0,
      section80D: body.section80D ?? payrollRecord?.taxDeclaration.section80D ?? 0,
      hraExemption: body.hraExemption ?? payrollRecord?.taxDeclaration.hraExemption ?? 0,
      ltaExemption: body.ltaExemption ?? payrollRecord?.taxDeclaration.ltaExemption ?? 0,
      npsContribution: body.npsContribution ?? payrollRecord?.taxDeclaration.npsContribution ?? 0,
      homeLoanInterest: body.homeLoanInterest ?? payrollRecord?.taxDeclaration.homeLoanInterest ?? 0,
      regime: body.regime ?? payrollRecord?.regime ?? 'old',
    };

    const result = simulateTax(input);

    await audit(req, 'TAX_SIMULATION', undefined, { input, totalTax: result.totalTax });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const investmentChecklist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);

    const payrollRecord = await PayrollRecord.findOne({ userId, financialYear: '2024-25' });
    if (!payrollRecord) {
      res.status(404).json({ error: 'No payroll record found' });
      return;
    }

    const payslip = await Payslip.findOne({ userId }).sort({ month: -1 });

    const traceId = uuidv4();
    const checklist = await llmService.generateInvestmentChecklist(
      payrollRecord.taxDeclaration,
      payslip?.fields ?? {
        basicSalary: 0, hra: 0, lta: 0, specialAllowance: 0, medicalAllowance: 0,
        conveyanceAllowance: 0, otherAllowances: 0, grossEarnings: 0, providentFund: 0,
        professionalTax: 0, incomeTaxTds: 0, otherDeductions: 0, totalDeductions: 0,
        netPay: 0, reimbursements: 0, ytdGross: 0, ytdTds: 0, ytdNetPay: 0,
        month: '', workingDays: 0, lopDays: 0,
      },
      traceId
    );

    await audit(req, 'INVESTMENT_CHECKLIST', undefined, { traceId });

    res.json({
      checklist,
      pendingProofs: payrollRecord.taxDeclaration.proofPendingFields,
      proofSubmitted: payrollRecord.taxDeclaration.proofSubmitted,
      traceId,
    });
  } catch (err) {
    next(err);
  }
};
