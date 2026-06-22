import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/user.model';
import { AuditLog } from '../models/audit.model';
import { createError } from '../middleware/error.middleware';

export interface LoginResult {
  token: string;
  user: Omit<IUser, 'passwordHash'>;
  expiresIn: string;
}

export class AuthService {
  async login(employeeId: string, password: string, ip: string, ua: string): Promise<LoginResult> {
    const user = await User.findOne({ employeeId });
    if (!user) throw createError('Invalid credentials', 401);

    const valid = await user.comparePassword(password);
    if (!valid) throw createError('Invalid credentials', 401);

    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
    const token = jwt.sign(
      { userId: user._id.toString(), employeeId: user.employeeId, role: user.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn } as jwt.SignOptions
    );

    await AuditLog.create({
      userId: user._id,
      employeeId: user.employeeId,
      action: 'LOGIN',
      ipAddress: ip,
      userAgent: ua,
    });

    return { token, user: user.toJSON() as unknown as Omit<IUser, 'passwordHash'>, expiresIn };
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }
}

export const authService = new AuthService();
