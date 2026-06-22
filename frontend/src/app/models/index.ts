// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  employeeId: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: string;
  user: User;
}

export interface User {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  role: 'employee' | 'admin' | 'payroll_team';
}

// ── Payslip ───────────────────────────────────────────────────────────────────
export interface PayslipFields {
  basicSalary: number;
  hra: number;
  lta: number;
  specialAllowance: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  otherAllowances: number;
  grossEarnings: number;
  providentFund: number;
  professionalTax: number;
  incomeTaxTds: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  reimbursements: number;
  ytdGross: number;
  ytdTds: number;
  ytdNetPay: number;
  month: string;
  workingDays: number;
  lopDays: number;
}

export interface Payslip {
  _id: string;
  month: string;
  fileName: string;
  uploadedAt: string;
  ocrConfidence: number;
  missingFields: string[];
  fields: PayslipFields;
}

export interface UploadPayslipResponse {
  message: string;
  payslipId: string;
  month: string;
  ocrConfidence: number;
  missingFields: string[];
  fields: PayslipFields;
}

// ── Payroll ───────────────────────────────────────────────────────────────────
export interface MonthlyBreakup {
  month: string;
  grossPay: number;
  netPay: number;
  tds: number;
}

export interface PayrollSummary {
  financialYear: string;
  annualCTC: number;
  monthlyCTC: number;
  monthlyBreakup: MonthlyBreakup[];
  regime: 'old' | 'new';
}

export interface TaxDeclaration {
  section80C: number;
  section80D: number;
  hraExemption: number;
  ltaExemption: number;
  npsContribution: number;
  homeLoanInterest: number;
  proofSubmitted: boolean;
  proofPendingFields: string[];
}

export interface YtdSummary {
  financialYear: string;
  monthsProcessed: number;
  ytdGross: number;
  ytdNetPay: number;
  ytdTds: number;
  taxDeclaration: TaxDeclaration;
}

// ── AI / Chat ─────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  question: string;
  month?: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}

export interface ChatResponse {
  answer: string;
  traceId: string;
  dataSource: string;
}

// ── Tax Simulation ─────────────────────────────────────────────────────────────
export interface TaxSimulationRequest {
  annualGross?: number;
  section80C: number;
  section80D: number;
  hraExemption: number;
  ltaExemption: number;
  npsContribution: number;
  homeLoanInterest: number;
  regime: 'old' | 'new';
}

export interface TaxSimulationResult {
  taxableIncome: number;
  totalTax: number;
  monthlyTds: number;
  effectiveRate: number;
  savings: number;
  deductionsApplied: Record<string, number>;
  assumptions: string[];
  suggestions: string[];
}

export interface InvestmentChecklistResponse {
  checklist: string;
  pendingProofs: string[];
  proofSubmitted: boolean;
  traceId: string;
}
