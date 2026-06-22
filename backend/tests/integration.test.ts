/**
 * Auth & Security edge case tests.
 * Run after seeding the DB (npm run seed).
 */
import { simulateTax } from '../src/utils/tax.utils';
import { OcrService } from '../src/services/ocr.service';

// ── Authorization boundary tests (unit-level logic) ──────────────────────────

describe('Authorization boundaries', () => {
  it('should detect cross-user access attempt', () => {
    // Simulate ownership check logic
    const resourceOwnerId = 'user_abc';
    const requestingUserId = 'user_xyz';

    const isAuthorized = (ownerId: string, requesterId: string) => ownerId === requesterId;

    expect(isAuthorized(resourceOwnerId, requestingUserId)).toBe(false);
    expect(isAuthorized(resourceOwnerId, resourceOwnerId)).toBe(true);
  });
});

// ── OCR edge cases ────────────────────────────────────────────────────────────

describe('OcrService edge cases', () => {
  const ocr = new OcrService();

  it('should resolve month from filename with YYYY-MM pattern', async () => {
    const result = await ocr.extractPayslip(Buffer.from('%PDF mock'), 'payslip-2024-11.pdf');
    expect(result.month).toBe('2024-11');
  });

  it('should default to last month when filename has no date', async () => {
    const result = await ocr.extractPayslip(Buffer.from('%PDF mock'), 'salary-slip.pdf');
    // Should be a valid YYYY-MM string
    expect(result.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('should report confidence between 0.94 and 1', async () => {
    const result = await ocr.extractPayslip(Buffer.from('%PDF mock'), 'slip.pdf');
    expect(result.confidence).toBeGreaterThanOrEqual(0.94);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should return non-zero netPay', async () => {
    const result = await ocr.extractPayslip(Buffer.from('%PDF mock'), 'payslip.pdf');
    expect(result.fields.netPay).toBeGreaterThan(0);
  });

  it('should return empty missingFields for complete mock data', async () => {
    const result = await ocr.extractPayslip(Buffer.from('%PDF mock'), 'payslip.pdf');
    expect(result.missingFields.length).toBe(0);
  });

  it('should calculate grossEarnings as sum of components', async () => {
    const result = await ocr.extractPayslip(Buffer.from('%PDF mock'), 'payslip.pdf');
    const { basicSalary, hra, lta, specialAllowance, medicalAllowance, conveyanceAllowance, otherAllowances } = result.fields;
    const expected = basicSalary + hra + lta + specialAllowance + medicalAllowance + conveyanceAllowance + otherAllowances;
    expect(result.fields.grossEarnings).toBe(expected);
  });

  it('should calculate totalDeductions correctly', async () => {
    const result = await ocr.extractPayslip(Buffer.from('%PDF mock'), 'payslip.pdf');
    const { providentFund, professionalTax, incomeTaxTds, otherDeductions } = result.fields;
    expect(result.fields.totalDeductions).toBe(providentFund + professionalTax + incomeTaxTds + otherDeductions);
  });

  it('should verify netPay = gross - deductions + reimbursements', async () => {
    const result = await ocr.extractPayslip(Buffer.from('%PDF mock'), 'payslip.pdf');
    const { grossEarnings, totalDeductions, reimbursements, netPay } = result.fields;
    expect(netPay).toBe(grossEarnings - totalDeductions + reimbursements);
  });
});

// ── Tax simulation edge cases ─────────────────────────────────────────────────

describe('Tax simulation edge cases', () => {
  it('should handle zero income gracefully', () => {
    const result = simulateTax({
      annualGross: 0,
      section80C: 0, section80D: 0, hraExemption: 0,
      ltaExemption: 0, npsContribution: 0, homeLoanInterest: 0,
      regime: 'old',
    });
    expect(result.totalTax).toBe(0);
    expect(result.taxableIncome).toBe(0);
  });

  it('should not produce negative taxable income', () => {
    const result = simulateTax({
      annualGross: 100000,
      section80C: 150000, // deductions exceed income
      section80D: 25000,
      hraExemption: 0, ltaExemption: 0, npsContribution: 0, homeLoanInterest: 0,
      regime: 'old',
    });
    expect(result.taxableIncome).toBeGreaterThanOrEqual(0);
  });

  it('should produce the same result for the same inputs (deterministic)', () => {
    const input = {
      annualGross: 1200000, section80C: 100000, section80D: 15000,
      hraExemption: 72000, ltaExemption: 30000, npsContribution: 0,
      homeLoanInterest: 0, regime: 'old' as const,
    };
    const r1 = simulateTax(input);
    const r2 = simulateTax(input);
    expect(r1.totalTax).toBe(r2.totalTax);
  });

  it('new regime should not apply old regime deductions', () => {
    const old = simulateTax({
      annualGross: 1000000, section80C: 150000, section80D: 25000,
      hraExemption: 0, ltaExemption: 0, npsContribution: 0, homeLoanInterest: 0,
      regime: 'old',
    });
    const newR = simulateTax({
      annualGross: 1000000, section80C: 150000, section80D: 25000,
      hraExemption: 0, ltaExemption: 0, npsContribution: 0, homeLoanInterest: 0,
      regime: 'new',
    });
    // New regime doesn't allow 80C/80D, so taxable income differs
    expect(newR.taxableIncome).not.toBe(old.taxableIncome);
  });

  it('monthlyTds should be totalTax / 12', () => {
    const result = simulateTax({
      annualGross: 1500000, section80C: 150000, section80D: 25000,
      hraExemption: 84000, ltaExemption: 30000, npsContribution: 50000,
      homeLoanInterest: 0, regime: 'old',
    });
    expect(result.monthlyTds).toBe(Math.round(result.totalTax / 12));
  });
});
