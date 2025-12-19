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
        playerId, // Check ownership directly
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
        playerId,
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

    // Calculate energy cost (1 energy per field)
    const currentX = ship.currentGalaxyX || 0;
    const currentY = ship.currentGalaxyY || 0;
    const distance = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
    const energyCost = distance;

    if (ship.energyDrive < energyCost) {
      return res.status(400).json({ 
        error: 'Nicht genug Antriebsenergie', 
        required: energyCost, 
        available: ship.energyDrive 
      });
    }

    // Instant hyperspace jump
    const updatedShip = await prisma.ship.update({
      where: { id: shipId },
      data: {
        status: 'DOCKED',
        currentGalaxyX: targetX,
        currentGalaxyY: targetY,
        energyDrive: ship.energyDrive - energyCost,
        planetId: null, // Undock from planet
        destinationX: null,
        destinationY: null,
      },
    });

    // Emit socket event for real-time update
    const io = (req as any).app.get('io');
    if (io && playerId) {
      io.to(`player-${playerId}`).emit('ship:moved', {
        shipId: updatedShip.id,
        galaxyX: targetX,
        galaxyY: targetY,
        energyDrive: updatedShip.energyDrive,
      });
    }

    res.json({ 
      success: true, 
      message: `Hypersprung nach ${targetX}|${targetY} abgeschlossen`,
      energyCost,
    });
  } catch (error) {
    console.error('Error moving ship:', error);
    res.status(500).json({ error: 'Fehler beim Hypersprung' });
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
        playerId,
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
    const updatedShip = await prisma.ship.update({
      where: { id: shipId },
      data: {
        currentSystemX: targetX,
        currentSystemY: targetY,
        energyDrive: ship.energyDrive - energyCost,
      },
    });

    // Emit socket event for real-time update
    const io = (req as any).app.get('io');
    if (io && playerId) {
      io.to(`player-${playerId}`).emit('ship:moved', {
        shipId: updatedShip.id,
        systemX: targetX,
        systemY: targetY,
        energyDrive: updatedShip.energyDrive,
      });
    }

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
 * POST /api/ship/:id/enter-system
 * Enter a system from hyperspace (galaxy map)
 */
router.post('/:id/enter-system', authMiddleware, async (req: any, res) => {
  try {
    const shipId = parseInt(req.params.id);
    const playerId = req.user?.player?.id;

    if (!playerId) {
      return res.status(403).json({ error: 'Kein Spieler-Account gefunden' });
    }

    // Get ship
    const ship = await prisma.ship.findFirst({
      where: {
        id: shipId,
        playerId,
      },
      include: {
        shipType: true,
      },
    });

    if (!ship) {
      return res.status(404).json({ error: 'Schiff nicht gefunden' });
    }

    if (ship.currentSystemId) {
      return res.status(400).json({ error: 'Schiff ist bereits in einem System' });
    }

    if (!ship.currentGalaxyX || !ship.currentGalaxyY) {
      return res.status(400).json({ error: 'Schiff hat keine Galaxy-Position' });
    }

    // Find system at current galaxy position
    const system = await prisma.system.findFirst({
      where: {
        sector: {
          x: Math.ceil(ship.currentGalaxyX / 20),
          y: Math.ceil(ship.currentGalaxyY / 20),
        },
        fieldX: ((ship.currentGalaxyX - 1) % 20) + 1,
        fieldY: ((ship.currentGalaxyY - 1) % 20) + 1,
      },
    });

    if (!system) {
      return res.status(400).json({ error: 'Kein System an dieser Position' });
    }

    // Enter system at center position
    const centerX = Math.floor(system.gridSize / 2);
    const centerY = Math.floor(system.gridSize / 2);

    await prisma.ship.update({
      where: { id: shipId },
      data: {
        currentSystemId: system.id,
        currentSystemX: centerX,
        currentSystemY: centerY,
        status: 'DOCKED', // Stop hyperspace flight
        destinationX: null,
        destinationY: null,
      },
    });

    res.json({ 
      success: true, 
      message: `System ${system.name} betreten`,
      systemId: system.id,
      systemName: system.name,
    });
  } catch (error) {
    console.error('Error entering system:', error);
    res.status(500).json({ error: 'Fehler beim System-Eintritt' });
  }
});

/**
 * POST /api/ship/:id/leave-system
 * Leave current system and return to hyperspace
 */
router.post('/:id/leave-system', authMiddleware, async (req: any, res) => {
  try {
    const shipId = parseInt(req.params.id);
    const playerId = req.user?.player?.id;

    if (!playerId) {
      return res.status(403).json({ error: 'Kein Spieler-Account gefunden' });
    }

    // Get ship with system
    const ship = await prisma.ship.findFirst({
      where: {
        id: shipId,
        playerId,
      },
      include: {
        shipType: true,
        system: {
          include: {
            sector: true,
          },
        },
      },
    });

    if (!ship) {
      return res.status(404).json({ error: 'Schiff nicht gefunden' });
    }

    if (!ship.currentSystemId || !ship.system) {
      return res.status(400).json({ error: 'Schiff ist nicht in einem System' });
    }

    // Calculate galaxy coordinates from system position
    const galaxyX = (ship.system.sector.x - 1) * 20 + ship.system.fieldX;
    const galaxyY = (ship.system.sector.y - 1) * 20 + ship.system.fieldY;

    await prisma.ship.update({
      where: { id: shipId },
      data: {
        currentSystemId: null,
        currentSystemX: null,
        currentSystemY: null,
        currentGalaxyX: galaxyX,
        currentGalaxyY: galaxyY,
        status: 'DOCKED', // In hyperspace but not moving
      },
    });

    res.json({ 
      success: true, 
      message: 'System verlassen - im Hyperraum',
      galaxyX,
      galaxyY,
    });
  } catch (error) {
    console.error('Error leaving system:', error);
    res.status(500).json({ error: 'Fehler beim System-Verlassen' });
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
        playerId,
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
  
  // If ship is in a system, return system-internal view
  if (ship.currentSystemId) {
    const planets = await prisma.planet.findMany({
      where: {
        systemId: ship.currentSystemId,
      },
      select: {
        id: true,
        name: true,
        orbitRadius: true,
        orbitAngle: true,
        player: {
          select: {
            id: true,
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

    // Get system info to calculate grid center
    const system = await prisma.system.findUnique({
      where: { id: ship.currentSystemId },
      select: { gridSize: true },
    });

    const centerX = ship.currentSystemX || Math.floor((system?.gridSize || 10) / 2);
    const centerY = ship.currentSystemY || Math.floor((system?.gridSize || 10) / 2);

    return {
      range: sensorRange,
      center: { x: centerX, y: centerY },
      ships: [],
      systems: [],
      planets: planets.map(p => ({
        id: p.id,
        name: p.name,
        orbitRadius: p.orbitRadius,
        orbitAngle: p.orbitAngle,
        owner: p.player?.user.username || null,
        faction: p.player?.faction.name || null,
      })),
      systemGridSize: system?.gridSize || 10,
    };
  }

  // Galaxy mode
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
    },
  });

  // Get systems within sensor range
  // Calculate galaxy coordinates for systems in view
  const systems = await prisma.system.findMany({
    where: {
      sector: {
        x: {
          gte: Math.floor((centerX - sensorRange - 1) / 20) + 1,
          lte: Math.floor((centerX + sensorRange + 1) / 20) + 1,
        },
        y: {
          gte: Math.floor((centerY - sensorRange - 1) / 20) + 1,
          lte: Math.floor((centerY + sensorRange + 1) / 20) + 1,
        },
      },
    },
    include: {
      sector: {
        select: {
          x: true,
          y: true,
        },
      },
    },
  });

  // Calculate galaxy coordinates for each system
  const systemsWithGalaxyCoords = systems.map(system => {
    const galaxyX = (system.sector.x - 1) * 20 + system.fieldX;
    const galaxyY = (system.sector.y - 1) * 20 + system.fieldY;
    
    // Only include if within actual sensor range
    if (Math.abs(galaxyX - centerX) <= sensorRange && Math.abs(galaxyY - centerY) <= sensorRange) {
      return {
        id: system.id,
        name: system.name,
        systemType: system.systemType,
        galaxyX,
        galaxyY,
      };
    }
    return null;
  }).filter(s => s !== null);

  return {
    range: sensorRange,
    center: { x: centerX, y: centerY },
    ships: nearbyShips,
    systems: systemsWithGalaxyCoords,
    planets: [],
    systemGridSize: 0,
  };
}

export default router;
