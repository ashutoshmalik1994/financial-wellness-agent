import { Schema, model, Document, Types } from 'mongoose';

export interface PayslipFields {
  // Earnings
  basicSalary: number;
  hra: number;
  lta: number;
  specialAllowance: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  otherAllowances: number;
  grossEarnings: number;
  // Deductions
  providentFund: number;
  professionalTax: number;
  incomeTaxTds: number;
  otherDeductions: number;
  totalDeductions: number;
  // Net
  netPay: number;
  // Reimbursements
  reimbursements: number;
  // YTD
  ytdGross: number;
  ytdTds: number;
  ytdNetPay: number;
  // Meta
  month: string; // e.g. "2024-11"
  workingDays: number;
  lopDays: number; // Loss of Pay
}

export interface IPayslip extends Document {
  userId: Types.ObjectId;
  employeeId: string;
  month: string;
  fileName: string;
  ocrRaw: string; // raw OCR text (mock)
  fields: PayslipFields;
  ocrConfidence: number; // 0-1 mock confidence
  missingFields: string[];
  uploadedAt: Date;
}

const payslipFieldsSchema = new Schema<PayslipFields>(
  {
    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    lta: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    conveyanceAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    grossEarnings: { type: Number, default: 0 },
    providentFund: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    incomeTaxTds: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    reimbursements: { type: Number, default: 0 },
    ytdGross: { type: Number, default: 0 },
    ytdTds: { type: Number, default: 0 },
    ytdNetPay: { type: Number, default: 0 },
    month: { type: String, required: true },
    workingDays: { type: Number, default: 22 },
    lopDays: { type: Number, default: 0 },
  },
  { _id: false }
);

const payslipSchema = new Schema<IPayslip>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeId: { type: String, required: true },
    month: { type: String, required: true },
    fileName: { type: String, required: true },
    ocrRaw: { type: String, default: '' },
    fields: { type: payslipFieldsSchema, required: true },
    ocrConfidence: { type: Number, default: 0.95 },
    missingFields: [{ type: String }],
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index: one payslip per user per month
payslipSchema.index({ userId: 1, month: 1 }, { unique: true });

export const Payslip = model<IPayslip>('Payslip', payslipSchema);
