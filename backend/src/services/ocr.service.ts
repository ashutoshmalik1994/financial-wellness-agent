import { PayslipFields } from '../models/payslip.model';

export interface OcrResult {
  raw: string;
  fields: PayslipFields;
  confidence: number;
  missingFields: string[];
  month: string;
}

/**
 * Mock OCR service.
 * In production: integrate Tesseract.js, AWS Textract, or Google Document AI.
 * Returns realistic payslip data with slight variance per upload.
 */
export class OcrService {
  async extractPayslip(fileBuffer: Buffer, fileName: string, month?: string): Promise<OcrResult> {
    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 300));

    // Derive month from filename or default to current month
    const resolvedMonth = month || this.resolveMonth(fileName);

    // Base salary structure (₹ values) with small random variance
    const variance = () => Math.floor((Math.random() - 0.5) * 500);

    const basicSalary = 45000 + variance();
    const hra = Math.round(basicSalary * 0.4);
    const lta = 2500;
    const specialAllowance = 12000 + variance();
    const medicalAllowance = 1250;
    const conveyanceAllowance = 1600;
    const otherAllowances = 500;
    const reimbursements = 3000;

    const grossEarnings =
      basicSalary +
      hra +
      lta +
      specialAllowance +
      medicalAllowance +
      conveyanceAllowance +
      otherAllowances;

    const providentFund = Math.round(basicSalary * 0.12);
    const professionalTax = 200;
    const incomeTaxTds = Math.round(grossEarnings * 0.08);
    const otherDeductions = 0;
    const totalDeductions = providentFund + professionalTax + incomeTaxTds + otherDeductions;
    const netPay = grossEarnings - totalDeductions + reimbursements;

    // YTD (assume 6 months in)
    const ytdGross = grossEarnings * 6;
    const ytdTds = incomeTaxTds * 6;
    const ytdNetPay = netPay * 6;

    const fields: PayslipFields = {
      basicSalary,
      hra,
      lta,
      specialAllowance,
      medicalAllowance,
      conveyanceAllowance,
      otherAllowances,
      grossEarnings,
      providentFund,
      professionalTax,
      incomeTaxTds,
      otherDeductions,
      totalDeductions,
      netPay,
      reimbursements,
      ytdGross,
      ytdTds,
      ytdNetPay,
      month: resolvedMonth,
      workingDays: 22,
      lopDays: 0,
    };

    const raw = this.generateOcrText(fields, resolvedMonth);
    const missingFields = this.detectMissingFields(fields);

    return {
      raw,
      fields,
      confidence: 0.94 + Math.random() * 0.05,
      missingFields,
      month: resolvedMonth,
    };
  }

  private resolveMonth(fileName: string): string {
    // Try to parse YYYY-MM from filename (e.g. payslip-2024-11.pdf)
    const match = fileName.match(/(\d{4})[_-](\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
    // Default to last month
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private generateOcrText(f: PayslipFields, month: string): string {
    return `
PAYSLIP - ${month}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EARNINGS
Basic Salary          ₹${f.basicSalary.toLocaleString('en-IN')}
House Rent Allowance  ₹${f.hra.toLocaleString('en-IN')}
Leave Travel Allow.   ₹${f.lta.toLocaleString('en-IN')}
Special Allowance     ₹${f.specialAllowance.toLocaleString('en-IN')}
Medical Allowance     ₹${f.medicalAllowance.toLocaleString('en-IN')}
Conveyance Allow.     ₹${f.conveyanceAllowance.toLocaleString('en-IN')}
Other Allowances      ₹${f.otherAllowances.toLocaleString('en-IN')}
Reimbursements        ₹${f.reimbursements.toLocaleString('en-IN')}
GROSS EARNINGS        ₹${f.grossEarnings.toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEDUCTIONS
Provident Fund (12%)  ₹${f.providentFund.toLocaleString('en-IN')}
Professional Tax      ₹${f.professionalTax.toLocaleString('en-IN')}
Income Tax (TDS)      ₹${f.incomeTaxTds.toLocaleString('en-IN')}
TOTAL DEDUCTIONS      ₹${f.totalDeductions.toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NET PAY               ₹${f.netPay.toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YTD GROSS             ₹${f.ytdGross.toLocaleString('en-IN')}
YTD TDS               ₹${f.ytdTds.toLocaleString('en-IN')}
YTD NET PAY           ₹${f.ytdNetPay.toLocaleString('en-IN')}
Working Days: ${f.workingDays} | LOP Days: ${f.lopDays}
    `.trim();
  }

  private detectMissingFields(fields: PayslipFields): string[] {
    const missing: string[] = [];
    if (!fields.basicSalary) missing.push('basicSalary');
    if (!fields.grossEarnings) missing.push('grossEarnings');
    if (!fields.netPay) missing.push('netPay');
    return missing;
  }
}

export const ocrService = new OcrService();
