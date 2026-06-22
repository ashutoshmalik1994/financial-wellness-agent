import { Request } from 'express';
import { AuditLog, AuditAction } from '../models/audit.model';
import { Types } from 'mongoose';
import { logger } from './logger';

export async function audit(
  req: Request,
  action: AuditAction,
  resourceId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    if (!req.user) return;
    await AuditLog.create({
      userId: new Types.ObjectId(req.user.userId),
      employeeId: req.user.employeeId,
      action,
      resourceId,
      metadata,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
  } catch (err) {
    logger.error('Audit log write failed', err);
  }
}
