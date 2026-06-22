import { calculateTax, simulateTax } from '../src/utils/tax.utils';

describe('Tax Calculations (Old Regime FY 2024-25)', () => {
  describe('calculateTax', () => {
    it('should return 0 tax for income ≤ ₹2,50,000', () => {
      const result = calculateTax(200000, 'old');
      expect(result.tax).toBe(0);
    });

    it('should apply 5% slab for ₹2,50,001 – ₹5,00,000', () => {
      const result = calculateTax(400000, 'old');
      // (400000 - 250000) * 5% = 7500, then 4% cess = 300, total = 7800
      // But 87A rebate applies (income <= 5L) → tax = 0
      expect(result.tax).toBe(0);
    });

    it('should apply 87A rebate for income at ₹5,00,000 (near-zero tax)', () => {
      // At exactly ₹5L: slab tax=12500, cess=500 → total=13000, rebate=min(13000,12500)=12500
      // After rebate: 13000 - 12500 = 500 (cess remainder)
      const result = calculateTax(500000, 'old');
      expect(result.tax).toBeLessThanOrEqual(500);
    });

    it('should calculate correct tax for ₹8,00,000', () => {
      // 0 + 12500 (5% slab) + (800000-500000)*20% = 12500+60000 = 72500 + cess 2900 = 75400
      const result = calculateTax(800000, 'old');
      expect(result.tax).toBeGreaterThan(70000);
      expect(result.tax).toBeLessThan(80000);
    });

    it('should apply 30% slab for income above ₹10,00,000', () => {
      const result = calculateTax(1500000, 'old');
      // Effective rate at ₹15L is ~18–20% after cess, but marginal rate is 30%
      expect(result.effectiveRate).toBeGreaterThan(15);
      expect(result.breakdown.some((b) => b.slab.includes('30%'))).toBe(true);
    });

    it('should include 4% cess', () => {
      const result = calculateTax(1000000, 'old');
      const breakdown = result.breakdown;
      const cessEntry = breakdown.find((b) => b.slab.includes('Cess'));
      expect(cessEntry).toBeTruthy();
    });
  });

  describe('simulateTax', () => {
    it('should reduce tax with 80C deductions', () => {
      const withoutDeductions = simulateTax({
        annualGross: 1000000,
        section80C: 0,
        section80D: 0,
        hraExemption: 0,
        ltaExemption: 0,
        npsContribution: 0,
        homeLoanInterest: 0,
        regime: 'old',
      });

      const withDeductions = simulateTax({
        annualGross: 1000000,
        section80C: 150000,
        section80D: 0,
        hraExemption: 0,
        ltaExemption: 0,
        npsContribution: 0,
        homeLoanInterest: 0,
        regime: 'old',
      });

      expect(withDeductions.totalTax).toBeLessThan(withoutDeductions.totalTax);
      expect(withDeductions.savings).toBeGreaterThan(0);
    });

    it('should cap 80C at ₹1,50,000', () => {
      const result = simulateTax({
        annualGross: 1200000,
        section80C: 300000, // over limit
        section80D: 0,
        hraExemption: 0,
        ltaExemption: 0,
        npsContribution: 0,
        homeLoanInterest: 0,
        regime: 'old',
      });
      expect(result.deductionsApplied['Section 80C']).toBe(150000);
    });

    it('should apply standard deduction of ₹50,000', () => {
      const result = simulateTax({
        annualGross: 800000,
        section80C: 0,
        section80D: 0,
        hraExemption: 0,
        ltaExemption: 0,
        npsContribution: 0,
        homeLoanInterest: 0,
        regime: 'old',
      });
      expect(result.deductionsApplied['Standard Deduction']).toBe(50000);
      expect(result.taxableIncome).toBe(750000);
    });

    it('should provide suggestions when 80C is not maxed out', () => {
      const result = simulateTax({
        annualGross: 1000000,
        section80C: 50000,
        section80D: 0,
        hraExemption: 0,
        ltaExemption: 0,
        npsContribution: 0,
        homeLoanInterest: 0,
        regime: 'old',
      });
      const hasSuggestion = result.suggestions.some((s) => s.includes('80C'));
      expect(hasSuggestion).toBe(true);
    });

    it('should have correct monthly TDS calculation', () => {
      const result = simulateTax({
        annualGross: 1200000,
        section80C: 150000,
        section80D: 25000,
        hraExemption: 72000,
        ltaExemption: 30000,
        npsContribution: 0,
        homeLoanInterest: 0,
        regime: 'old',
      });
      expect(result.monthlyTds).toBe(Math.round(result.totalTax / 12));
    });
  });
});
