import express from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';
import { shipMovementService } from '../services/shipMovementService';

const router = express.Router();

/**
 * GET /api/ship/:id
 * Get ship details with sensor view
 */
router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const shipId = parseInt(req.params.id);
    const playerId = req.user?.player?.id;

    if (!playerId) {
      return res.status(403).json({ error: 'Kein Spieler-Account gefunden' });
    }

    // Get ship with full details
    const ship = await prisma.ship.findFirst({
      where: {
        id: shipId,
        planet: {
          playerId, // Only own ships
        },
      },
      include: {
        shipType: true,
        planet: {
          include: {
            system: true,
          },
        },
        system: true,
      },
    });

    if (!ship) {
      return res.status(404).json({ error: 'Schiff nicht gefunden oder keine Berechtigung' });
    }

    // Calculate range
    const range = shipMovementService.calculateRange(ship);

    // Get sensor view (fields within sensor range)
    const sensorData = await getSensorView(ship);

    res.json({
      ship: {
        id: ship.id,
        name: ship.name,
        status: ship.status,
        currentSystemId: ship.currentSystemId,
        position: {
          galaxyX: ship.currentGalaxyX,
          galaxyY: ship.currentGalaxyY,
          systemX: ship.currentSystemX,
          systemY: ship.currentSystemY,
        },
        destination: {
          x: ship.destinationX,
          y: ship.destinationY,
        },
        energy: {
          weapons: ship.energyWeapons,
          drive: ship.energyDrive,
          maxWeapons: ship.shipType.maxEnergyWeapons,
          maxDrive: ship.shipType.maxEnergyDrive,
        },
        health: ship.health,
        crew: ship.crew,
        range,
      },
      shipType: {
        name: ship.shipType.name,
        sensorRange: ship.shipType.sensorRange,
        driveEfficiency: ship.shipType.driveEfficiency,
        attack: ship.shipType.attack,
        defense: ship.shipType.defense,
      },
      sensorView: sensorData,
    });
  } catch (error) {
    console.error('Error fetching ship:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

/**
 * POST /api/ship/:id/move
 * Set ship destination and start flight
 */
router.post('/:id/move', authMiddleware, async (req: any, res) => {
  try {
    const shipId = parseInt(req.params.id);
    const { targetX, targetY } = req.body;
    const playerId = req.user?.player?.id;

    if (!playerId) {
      return res.status(403).json({ error: 'Kein Spieler-Account gefunden' });
    }

    if (!targetX || !targetY) {
      return res.status(400).json({ error: 'Zielkoordinaten erforderlich' });
    }

    // Get ship
    const ship = await prisma.ship.findFirst({
      where: {
        id: shipId,
        planet: { playerId },
      },
      include: {
        shipType: true,
      },
    });

    if (!ship) {
      return res.status(404).json({ error: 'Schiff nicht gefunden' });
    }

    // Check if ship is docked or stranded
    if (ship.status !== 'DOCKED' && ship.status !== 'STRANDED') {
      return res.status(400).json({ error: 'Schiff bereits im Flug' });
    }

    // Calculate energy cost
    const cost = shipMovementService.calculateFlightCost(ship, targetX, targetY);

    if (ship.energyDrive < cost) {
      return res.status(400).json({ 
        error: 'Nicht genug Antriebsenergie', 
        required: cost, 
        available: ship.energyDrive 
      });
    }

    // Start flight
    await prisma.ship.update({
      where: { id: shipId },
      data: {
        status: 'IN_FLIGHT',
        destinationX: targetX,
        destinationY: targetY,
        planetId: null, // Undock from planet
      },
    });

    res.json({ 
      success: true, 
      message: `Flug nach ${targetX}|${targetY} gestartet`,
      energyCost: cost,
    });
  } catch (error) {
    console.error('Error starting ship movement:', error);
    res.status(500).json({ error: 'Fehler beim Flugstart' });
  }
});

/**
 * POST /api/ship/:id/move-system
 * Move within a system (system-internal navigation)
 */
router.post('/:id/move-system', authMiddleware, async (req: any, res) => {
  try {
    const shipId = parseInt(req.params.id);
    const { targetX, targetY } = req.body;
    const playerId = req.user?.player?.id;

    if (!playerId) {
      return res.status(403).json({ error: 'Kein Spieler-Account gefunden' });
    }

    if (targetX === undefined || targetY === undefined) {
      return res.status(400).json({ error: 'Zielkoordinaten erforderlich' });
    }

    // Get ship
    const ship = await prisma.ship.findFirst({
      where: {
        id: shipId,
        planet: { playerId },
      },
      include: {
        shipType: true,
        system: true,
      },
    });

    if (!ship) {
      return res.status(404).json({ error: 'Schiff nicht gefunden' });
    }

    if (!ship.currentSystemId) {
      return res.status(400).json({ error: 'Schiff ist nicht in einem System' });
    }

    // System-internal movement is almost free (1 energy per field)
    const currentX = ship.currentSystemX || 0;
    const currentY = ship.currentSystemY || 0;
    const distance = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
    const energyCost = distance; // 1 energy per field in system

    if (ship.energyDrive < energyCost) {
      return res.status(400).json({ 
        error: 'Nicht genug Energie', 
        required: energyCost, 
        available: ship.energyDrive 
      });
    }

    // Instant movement within system
    await prisma.ship.update({
      where: { id: shipId },
      data: {
        currentSystemX: targetX,
        currentSystemY: targetY,
        energyDrive: ship.energyDrive - energyCost,
      },
    });

    res.json({ 
      success: true, 
      message: `Position im System: ${targetX}|${targetY}`,
      energyCost,
    });
  } catch (error) {
    console.error('Error moving ship in system:', error);
    res.status(500).json({ error: 'Fehler bei System-Navigation' });
  }
});

/**
 * POST /api/ship/:id/charge
 * Charge ship energy from planet
 */
router.post('/:id/charge', authMiddleware, async (req: any, res) => {
  try {
    const shipId = parseInt(req.params.id);
    const { type, amount } = req.body; // type: 'weapons' | 'drive'
    const playerId = req.user?.player?.id;

    if (!playerId) {
      return res.status(403).json({ error: 'Kein Spieler-Account gefunden' });
    }

    const ship = await prisma.ship.findFirst({
      where: {
        id: shipId,
        planet: { playerId },
      },
      include: {
        shipType: true,
        planet: true,
      },
    });

    if (!ship) {
      return res.status(404).json({ error: 'Schiff nicht gefunden' });
    }

    if (ship.status !== 'DOCKED' || !ship.planet) {
      return res.status(400).json({ error: 'Schiff muss angedockt sein' });
    }

    // For now: charging is free (later: cost resources from planet)
    const updateData: any = {};

    if (type === 'weapons') {
      updateData.energyWeapons = Math.min(
        ship.energyWeapons + amount,
        ship.shipType.maxEnergyWeapons
      );
    } else if (type === 'drive') {
      updateData.energyDrive = Math.min(
        ship.energyDrive + amount,
        ship.shipType.maxEnergyDrive
      );
    } else {
      return res.status(400).json({ error: 'Ungültiger Energietyp' });
    }

    await prisma.ship.update({
      where: { id: shipId },
      data: updateData,
    });

    res.json({ success: true, message: 'Energie geladen' });
  } catch (error) {
    console.error('Error charging ship:', error);
    res.status(500).json({ error: 'Fehler beim Aufladen' });
  }
});

/**
 * Helper: Get sensor view around ship
 */
async function getSensorView(ship: any) {
  const sensorRange = ship.shipType.sensorRange;
  const centerX = ship.currentGalaxyX || 0;
  const centerY = ship.currentGalaxyY || 0;

  // Get all ships within sensor range
  const nearbyShips = await prisma.ship.findMany({
    where: {
      currentGalaxyX: {
        gte: centerX - sensorRange,
        lte: centerX + sensorRange,
      },
      currentGalaxyY: {
        gte: centerY - sensorRange,
        lte: centerY + sensorRange,
      },
      status: {
        in: ['IN_FLIGHT', 'STRANDED'],
      },
    },
    select: {
      id: true,
      currentGalaxyX: true,
      currentGalaxyY: true,
      planet: {
        select: {
          player: {
            select: {
              faction: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Get systems within sensor range (simplified for now)
  const systems = await prisma.system.findMany({
    where: {
      fieldX: {
        gte: Math.floor((centerX - sensorRange) / 20) * 20 + 1,
        lte: Math.floor((centerX + sensorRange) / 20) * 20 + 20,
      },
      fieldY: {
        gte: Math.floor((centerY - sensorRange) / 20) * 20 + 1,
        lte: Math.floor((centerY + sensorRange) / 20) * 20 + 20,
      },
    },
    select: {
      id: true,
      name: true,
      systemType: true,
      fieldX: true,
      fieldY: true,
    },
  });

  return {
    range: sensorRange,
    center: { x: centerX, y: centerY },
    ships: nearbyShips,
    systems,
  };
}

export default router;
