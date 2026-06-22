import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { User } from '../models/user.model';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) {
      res.status(400).json({ error: 'employeeId and password are required' });
      return;
    }
    const result = await authService.login(
      employeeId,
      password,
      req.ip || 'unknown',
      req.headers['user-agent'] || 'unknown'
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};
