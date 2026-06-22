import { Schema, model, Document, Types } from 'mongoose';

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

export interface IPayrollRecord extends Document {
  userId: Types.ObjectId;
  employeeId: string;
  financialYear: string; // e.g. "2024-25"
  annualCTC: number;
  monthlyBreakup: {
    month: string;
    grossPay: number;
    netPay: number;
    tds: number;
  }[];
  taxDeclaration: TaxDeclaration;
  regime: 'old' | 'new';
}

const payrollRecordSchema = new Schema<IPayrollRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeId: { type: String, required: true },
    financialYear: { type: String, required: true },
    annualCTC: { type: Number, required: true },
    monthlyBreakup: [
      {
        month: String,
        grossPay: Number,
        netPay: Number,
        tds: Number,
        _id: false,
      },
    ],
    taxDeclaration: {
      section80C: { type: Number, default: 0 },
      section80D: { type: Number, default: 0 },
      hraExemption: { type: Number, default: 0 },
      ltaExemption: { type: Number, default: 0 },
      npsContribution: { type: Number, default: 0 },
      homeLoanInterest: { type: Number, default: 0 },
      proofSubmitted: { type: Boolean, default: false },
      proofPendingFields: [{ type: String }],
    },
    regime: { type: String, enum: ['old', 'new'], default: 'old' },
  },
  { timestamps: true }
);

payrollRecordSchema.index({ userId: 1, financialYear: 1 }, { unique: true });

export const PayrollRecord = model<IPayrollRecord>('PayrollRecord', payrollRecordSchema);
