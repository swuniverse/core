import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../lib/prisma';

export const adminAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    // Get user with player data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        player: true,
      },
    });

    if (!user || !user.player) {
      return res.status(401).json({ error: 'Spieler nicht gefunden' });
    }

    if (!user.player.isAdmin) {
      return res.status(403).json({ error: 'Keine Admin-Rechte' });
    }

    // Attach player to request
    (req as any).user = user;

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
