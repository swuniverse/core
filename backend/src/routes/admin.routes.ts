import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import prisma from '../lib/prisma';
import { tickSystem } from '../index';
import { emitToPlayer } from '../socket';

const router = Router();

// All admin routes require both auth and admin middleware
router.use(authMiddleware);
router.use(adminAuthMiddleware);

// Trigger tick manually
router.post('/trigger-tick', async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req as any;

    console.log(`🔧 Admin ${user.username} manually triggered a tick`);

    // Process tick
    await tickSystem.processTick();

    res.json({ 
      success: true, 
      message: 'Tick erfolgreich ausgelöst' 
    });
  } catch (error: any) {
    console.error('Admin trigger tick error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add resources to a planet
router.post('/add-resources', async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req as any;
    const { planetId, credits, durastahl, kristall, energy } = req.body;

    if (!planetId) {
      return res.status(400).json({ error: 'Planet ID erforderlich' });
    }

    // Get planet
    const planet = await prisma.planet.findUnique({
      where: { id: planetId },
    });

    if (!planet) {
      return res.status(404).json({ error: 'Planet nicht gefunden' });
    }

    // Update resources
    const updatedPlanet = await prisma.planet.update({
      where: { id: planetId },
      data: {
        credits: { increment: credits || 0 },
        durastahl: { increment: durastahl || 0 },
        kristallinesSilizium: { increment: kristall || 0 },
        energy: { increment: energy || 0 },
      },
    });

    console.log(`🔧 Admin ${user.username} added resources to planet ${planetId}`);

    // Emit resource update
    emitToPlayer(planet.playerId, 'resource:updated', {
      planetId,
      credits: updatedPlanet.credits,
      durastahl: updatedPlanet.durastahl,
      kristall: updatedPlanet.kristallinesSilizium,
      energy: updatedPlanet.energy,
    });

    res.json({ 
      success: true, 
      message: 'Ressourcen hinzugefügt',
      planet: updatedPlanet,
    });
  } catch (error: any) {
    console.error('Admin add resources error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get admin status
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req as any;

    res.json({
      isAdmin: user.player.isAdmin,
      username: user.username,
    });
  } catch (error: any) {
    console.error('Admin status error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
