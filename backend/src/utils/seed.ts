import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { PayrollRecord } from '../models/payroll.model';
import { logger } from './logger';

export async function seedDatabase(): Promise<void> {
  const existing = await User.countDocuments();
  if (existing > 0) return; // Already seeded

  logger.info('🌱 Seeding demo data...');

  const hash = await bcrypt.hash('Demo@1234', 12);

  const users = await User.insertMany([
    {
      employeeId: 'EMP001',
      name: 'Arjun Mehta',
      email: 'arjun.mehta@company.com',
      passwordHash: hash,
      department: 'Engineering',
      designation: 'Senior Software Engineer',
      panNumber: 'ABCPM1234D',
      role: 'employee',
    },
    {
      employeeId: 'EMP002',
      name: 'Priya Sharma',
      email: 'priya.sharma@company.com',
      passwordHash: hash,
      department: 'Product',
      designation: 'Product Manager',
      panNumber: 'DEFPS5678G',
      role: 'employee',
    },
    {
      employeeId: 'ADMIN01',
      name: 'HR Admin',
      email: 'admin@company.com',
      passwordHash: hash,
      department: 'HR',
      designation: 'HR Manager',
      panNumber: 'GHIAD0001Z',
      role: 'admin',
    },
  ]);

  // Seed payroll records
  await PayrollRecord.insertMany([
    {
      userId: users[0]._id,
      employeeId: 'EMP001',
      financialYear: '2024-25',
      annualCTC: 1440000,
      monthlyBreakup: generateMonthlyBreakup(),
      taxDeclaration: {
        section80C: 100000,
        section80D: 20000,
        hraExemption: 60000,
        ltaExemption: 30000,
        npsContribution: 0,
        homeLoanInterest: 0,
        proofSubmitted: false,
        proofPendingFields: ['Section 80C Investment Proof', 'Section 80D Health Insurance Premium Receipt'],
      },
      regime: 'old',
    },
    {
      userId: users[1]._id,
      employeeId: 'EMP002',
      financialYear: '2024-25',
      annualCTC: 1800000,
      monthlyBreakup: generateMonthlyBreakup(18000),
      taxDeclaration: {
        section80C: 150000,
        section80D: 25000,
        hraExemption: 84000,
        ltaExemption: 30000,
        npsContribution: 50000,
        homeLoanInterest: 120000,
        proofSubmitted: true,
        proofPendingFields: [],
      },
      regime: 'old',
    },
  ]);

  logger.info('✅ Demo data seeded. Login: EMP001 / Demo@1234 or EMP002 / Demo@1234');
}

function generateMonthlyBreakup(netPayBase = 14000): { month: string; grossPay: number; netPay: number; tds: number }[] {
  const months = ['2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11'];
  return months.map((m) => ({
    month: m,
    grossPay: 63850,
    netPay: netPayBase + 49000,
    tds: 5100,
  }));
}
