import { Schema, model, Document, Types } from 'mongoose';

export type AuditAction =
  | 'LOGIN'
  | 'PAYSLIP_UPLOAD'
  | 'PAYSLIP_VIEW'
  | 'PAYROLL_QUERY'
  | 'AI_CHAT'
  | 'TAX_SIMULATION'
  | 'INVESTMENT_CHECKLIST'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT';

export interface IAuditLog extends Document {
  userId: Types.ObjectId;
  employeeId: string;
  action: AuditAction;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employeeId: { type: String, required: true },
  action: { type: String, required: true },
  resourceId: { type: String },
  metadata: { type: Schema.Types.Mixed },
  ipAddress: { type: String, default: 'unknown' },
  userAgent: { type: String, default: 'unknown' },
  timestamp: { type: Date, default: Date.now, index: true },
});

// TTL: auto-delete logs older than 1 year
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
