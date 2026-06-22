/**
 * Simplified Indian Income Tax calculator (Old Regime, FY 2024-25).
 * Assumptions are clearly documented and stated in AI responses.
 */

export interface TaxSlabs {
  income: number;
  tax: number;
  effectiveRate: number;
  breakdown: { slab: string; tax: number }[];
}

export interface TaxSimulationInput {
  annualGross: number;
  section80C: number;
  section80D: number;
  hraExemption: number;
  ltaExemption: number;
  npsContribution: number; // 80CCD(1B)
  homeLoanInterest: number; // 24b
  regime: 'old' | 'new';
}

export interface TaxSimulationResult {
  taxableIncome: number;
  totalTax: number;
  monthlyTds: number;
  effectiveRate: number;
  savings: number; // compared to no deductions
  deductionsApplied: Record<string, number>;
  assumptions: string[];
  suggestions: string[];
}

const STANDARD_DEDUCTION = 50000;
const MAX_80C = 150000;
const MAX_80D_SELF = 25000;
const MAX_NPS_80CCD = 50000;
const MAX_HOME_LOAN_24B = 200000;
const MAX_HRA_EXEMPTION_LIMIT = 300000; // simplified cap

// Old regime slabs (AY 2025-26)
const OLD_REGIME_SLABS = [
  { upto: 250000, rate: 0 },
  { upto: 500000, rate: 0.05 },
  { upto: 1000000, rate: 0.2 },
  { upto: Infinity, rate: 0.3 },
];

// New regime slabs (AY 2025-26)
const NEW_REGIME_SLABS = [
  { upto: 300000, rate: 0 },
  { upto: 600000, rate: 0.05 },
  { upto: 900000, rate: 0.1 },
  { upto: 1200000, rate: 0.15 },
  { upto: 1500000, rate: 0.2 },
  { upto: Infinity, rate: 0.3 },
];

export function calculateTax(income: number, regime: 'old' | 'new'): TaxSlabs {
  const slabs = regime === 'old' ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  let remaining = income;
  let tax = 0;
  let prev = 0;
  const breakdown: { slab: string; tax: number }[] = [];

  for (const { upto, rate } of slabs) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, upto - prev);
    const slabTax = Math.round(taxable * rate);
    if (slabTax > 0) breakdown.push({ slab: `₹${prev.toLocaleString('en-IN')} – ₹${Math.min(upto, income).toLocaleString('en-IN')} @ ${rate * 100}%`, tax: slabTax });
    tax += slabTax;
    remaining -= taxable;
    prev = upto;
  }

  // 4% health & education cess
  const cess = Math.round(tax * 0.04);
  tax += cess;
  breakdown.push({ slab: 'Health & Education Cess (4%)', tax: cess });

  // 87A rebate (income ≤ ₹5L → full rebate in old; ≤ ₹7L in new)
  const rebateLimit = regime === 'old' ? 500000 : 700000;
  if (income <= rebateLimit && tax > 0) {
    const rebate = Math.min(tax, regime === 'old' ? 12500 : 25000);
    breakdown.push({ slab: 'Section 87A Rebate', tax: -rebate });
    tax = Math.max(0, tax - rebate);
  }

  return {
    income,
    tax,
    effectiveRate: income > 0 ? parseFloat(((tax / income) * 100).toFixed(2)) : 0,
    breakdown,
  };
}

export function simulateTax(input: TaxSimulationInput): TaxSimulationResult {
  const assumptions = [
    'Old Regime FY 2024-25 (unless New Regime selected)',
    'Standard Deduction of ₹50,000 applied',
    'Section 80C capped at ₹1,50,000',
    'Section 80D capped at ₹25,000 (self & family)',
    'NPS 80CCD(1B) capped at ₹50,000',
    'Home Loan Interest (24b) capped at ₹2,00,000',
    'HRA exemption per simplified formula (actual rent − 10% basic)',
    '4% Health & Education Cess included',
    'Surcharge not applied (income assumed < ₹50L)',
  ];

  const suggestions: string[] = [];

  const deductionsApplied: Record<string, number> = {};

  let taxableIncome = input.annualGross;

  if (input.regime === 'old') {
    const std = STANDARD_DEDUCTION;
    deductionsApplied['Standard Deduction'] = std;
    taxableIncome -= std;

    const c80 = Math.min(input.section80C, MAX_80C);
    if (c80 > 0) deductionsApplied['Section 80C'] = c80;
    taxableIncome -= c80;
    if (input.section80C < MAX_80C) {
      suggestions.push(`You can invest ₹${(MAX_80C - input.section80C).toLocaleString('en-IN')} more under 80C (ELSS, PPF, LIC) to maximize tax savings.`);
    }

    const d80 = Math.min(input.section80D, MAX_80D_SELF);
    if (d80 > 0) deductionsApplied['Section 80D'] = d80;
    taxableIncome -= d80;
    if (input.section80D < MAX_80D_SELF) {
      suggestions.push(`Consider health insurance to claim up to ₹25,000 under Section 80D.`);
    }

    const hra = Math.min(input.hraExemption, MAX_HRA_EXEMPTION_LIMIT);
    if (hra > 0) deductionsApplied['HRA Exemption'] = hra;
    taxableIncome -= hra;

    const lta = input.ltaExemption;
    if (lta > 0) deductionsApplied['LTA Exemption'] = lta;
    taxableIncome -= lta;

    const nps = Math.min(input.npsContribution, MAX_NPS_80CCD);
    if (nps > 0) deductionsApplied['NPS 80CCD(1B)'] = nps;
    taxableIncome -= nps;
    if (input.npsContribution < MAX_NPS_80CCD) {
      suggestions.push(`NPS contribution under 80CCD(1B) offers an additional ₹50,000 deduction beyond 80C.`);
    }

    const hl = Math.min(input.homeLoanInterest, MAX_HOME_LOAN_24B);
    if (hl > 0) deductionsApplied['Home Loan Interest (24b)'] = hl;
    taxableIncome -= hl;
  }

  taxableIncome = Math.max(0, taxableIncome);

  const withDeductions = calculateTax(taxableIncome, input.regime);
  const withoutDeductions = calculateTax(input.annualGross, input.regime);

  const savings = Math.max(0, withoutDeductions.tax - withDeductions.tax);
  if (savings > 0) {
    suggestions.push(`Your declared deductions save you approximately ₹${savings.toLocaleString('en-IN')} in annual tax (₹${Math.round(savings / 12).toLocaleString('en-IN')}/month in TDS).`);
  }

  return {
    taxableIncome,
    totalTax: withDeductions.tax,
    monthlyTds: Math.round(withDeductions.tax / 12),
    effectiveRate: withDeductions.effectiveRate,
    savings,
    deductionsApplied,
    assumptions,
    suggestions,
  };
}
