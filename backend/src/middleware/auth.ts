import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../services/authService';

export interface AuthRequest extends Request {
  userId?: number;
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    req.userId = decoded.userId;
    
    // Fetch user data for convenience
    const user = await authService.getUserById(decoded.userId);
    req.user = user;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
