import express from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';
import { getIo } from '../index';
import logger from '../lib/logger';

const router = express.Router();

// Get recent messages (last 100)
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await prisma.comnetMessage.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        player: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
            faction: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    logger.api('Fetched comnet messages:', messages.length);

    res.json(
      messages.reverse().map((msg) => ({
        id: msg.id,
        title: msg.title,
        message: msg.message,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        player: {
          id: msg.player.id,
          username: msg.player.user.username,
          factionName: msg.player.faction.name,
        },
      }))
    );
  } catch (error: any) {
    logger.error('Failed to fetch comnet messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Post a new message
router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { title, message } = req.body;
    const user = (req as any).user;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Nachricht darf nicht leer sein' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Nachricht zu lang (max 5000 Zeichen)' });
    }

    if (title && title.length > 100) {
      return res.status(400).json({ error: 'Titel zu lang (max 100 Zeichen)' });
    }

    const newMessage = await prisma.comnetMessage.create({
      data: {
        playerId: user.player.id,
        title: title?.trim() || null,
        message: message.trim(),
      },
      include: {
        player: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
            faction: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    logger.info('New comnet message posted:', newMessage.id, 'by', newMessage.player.user.username);

    // Broadcast to all connected clients
    const io = getIo();
    io.emit('comnet:message', {
      id: newMessage.id,
      title: newMessage.title,
      message: newMessage.message,
      createdAt: newMessage.createdAt,
      player: {
        id: newMessage.player.id,
        username: newMessage.player.user.username,
        factionName: newMessage.player.faction.name,
      },
    });

    res.json({
      id: newMessage.id,
      title: newMessage.title,
      message: newMessage.message,
      createdAt: newMessage.createdAt,
      player: {
        id: newMessage.player.id,
        username: newMessage.player.user.username,
        factionName: newMessage.player.faction.name,
      },
    });
  } catch (error: any) {
    logger.error('Failed to post comnet message:', error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// Edit a message (only within 30 minutes)
router.put('/messages/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message } = req.body;
    const user = (req as any).user;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Nachricht darf nicht leer sein' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Nachricht zu lang (max 5000 Zeichen)' });
    }

    if (title && title.length > 100) {
      return res.status(400).json({ error: 'Titel zu lang (max 100 Zeichen)' });
    }

    // Find existing message
    const existingMessage = await prisma.comnetMessage.findUnique({
      where: { id: parseInt(id) },
      include: { player: true },
    });

    if (!existingMessage) {
      return res.status(404).json({ error: 'Nachricht nicht gefunden' });
    }

    // Check ownership
    if (existingMessage.playerId !== user.player.id) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    // Check 30 minute window
    const now = new Date();
    const createdAt = new Date(existingMessage.createdAt);
    const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

    if (diffMinutes > 30) {
      return res.status(403).json({ error: 'Bearbeitungszeit abgelaufen (max 30 Minuten)' });
    }

    // Update message
    const updatedMessage = await prisma.comnetMessage.update({
      where: { id: parseInt(id) },
      data: {
        title: title?.trim() || null,
        message: message.trim(),
      },
      include: {
        player: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
            faction: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    logger.info('Comnet message edited:', updatedMessage.id, 'by', updatedMessage.player.user.username);

    // Broadcast update to all connected clients
    const io = getIo();
    io.emit('comnet:updated', {
      id: updatedMessage.id,
      title: updatedMessage.title,
      message: updatedMessage.message,
      createdAt: updatedMessage.createdAt,
      updatedAt: updatedMessage.updatedAt,
      player: {
        id: updatedMessage.player.id,
        username: updatedMessage.player.user.username,
        factionName: updatedMessage.player.faction.name,
      },
    });

    res.json({
      id: updatedMessage.id,
      title: updatedMessage.title,
      message: updatedMessage.message,
      createdAt: updatedMessage.createdAt,
      updatedAt: updatedMessage.updatedAt,
      player: {
        id: updatedMessage.player.id,
        username: updatedMessage.player.user.username,
        factionName: updatedMessage.player.faction.name,
      },
    });
  } catch (error: any) {
    logger.error('Failed to edit comnet message:', error);
    res.status(500).json({ error: 'Fehler beim Bearbeiten' });
  }
});

export default router;
