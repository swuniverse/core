import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { galaxyService } from '../services/galaxyService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get complete galaxy view with all sectors and systems
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Get all systems with their planets
    const systems = await prisma.system.findMany({
      include: {
        sector: true,
        planets: {
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
        },
      },
    });

    // Group systems by sector
    const sectorMap = new Map<string, any>();

    systems.forEach((system) => {
      const key = `${system.sector.x},${system.sector.y}`;
      
      if (!sectorMap.has(key)) {
        sectorMap.set(key, {
          x: system.sector.x,
          y: system.sector.y,
          systems: [],
        });
      }

      const currentPlayerId = (req as any).user?.player?.id;
      const hasOwnPlanets = system.planets.some(p => p.player?.id === currentPlayerId);
      
      sectorMap.get(key).systems.push({
        id: system.id,
        name: system.name,
        systemType: system.systemType,
        fieldX: system.fieldX,
        fieldY: system.fieldY,
        planetCount: system.planets.length,
        hasPlayerPlanets: system.planets.some(p => p.player),
        hasOwnPlanets,
        factionName: system.planets.find(p => p.player)?.player?.faction.name,
      });
    });

    const sectors = Array.from(sectorMap.values());

    res.json({ sectors });
  } catch (error) {
    console.error('Error loading galaxy:', error);
    res.status(500).json({ error: 'Failed to load galaxy' });
  }
});

// Get system details with all planets
router.get('/system/:systemId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const systemId = parseInt(req.params.systemId);

    const system = await prisma.system.findUnique({
      where: { id: systemId },
      include: {
        sector: true,
        planets: {
          include: {
            player: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
                faction: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        // systemObjects removed - now part of planets with celestialType=ASTEROID_FIELD
      },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    res.json({
      id: system.id,
      name: system.name,
      systemType: system.systemType,
      fieldX: system.fieldX,
      fieldY: system.fieldY,
      gridSize: system.gridSize,
      sector: {
        x: system.sector.x,
        y: system.sector.y,
      },
      planets: system.planets.map(p => ({
        id: p.id,
        name: p.name,
        planetClass: p.planetClass,
        celestialType: p.celestialType,
        asteroidVariant: p.asteroidVariant, // For ASTEROID_FIELD types
        gridX: p.gridX,
        gridY: p.gridY,
        visualSeed: p.visualSeed,
        orbitRadius: p.orbitRadius,
        orbitAngle: p.orbitAngle,
        parentPlanetId: p.parentPlanetId,
        durastahl: p.durastahl, // Resource data for asteroid fields
        kristallinesSilizium: p.kristallinesSilizium,
        player: p.player ? {
          id: p.player.id,
          username: p.player.user.username,
          faction: {
            id: p.player.faction.id,
            name: p.player.faction.name,
          },
        } : null,
      })),
      // systemObjects removed - now included in planets array with celestialType=ASTEROID_FIELD
    });
  } catch (error) {
    console.error('Error loading system:', error);
    res.status(500).json({ error: 'Failed to load system' });
  }
});

// Get galaxy map
router.get('/map', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const galaxy = await galaxyService.initializeGalaxy();
    res.json(galaxy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available start planets for player's faction with optional query parameters
router.get('/start-planets', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req as any;

    if (!user?.player?.factionId) {
      return res.status(400).json({ error: 'Player faction not found' });
    }

    // Extract query parameters for co-op and refresh functionality
    const { nearSystem, refresh } = req.query;
    const options = {
      nearSystemName: nearSystem as string,
      refreshCount: parseInt(refresh as string) || 0
    };

    const planets = await galaxyService.getAvailableStartPlanets(user.player.factionId, options);

    // Handle co-op search specific responses
    if (options.nearSystemName && planets.length === 0) {
      return res.status(404).json({
        error: `System "${options.nearSystemName}" nicht gefunden oder keine verfügbaren Planeten in der Nähe`
      });
    }

    res.json(planets);
  } catch (error: any) {
    console.error('Error in start-planets endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Claim a start planet
router.post('/claim-planet/:planetId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req as any;
    const planetId = parseInt(req.params.planetId);

    if (!user?.player?.id) {
      return res.status(400).json({ error: 'Player not found' });
    }

    const planet = await galaxyService.claimStartPlanet(user.player.id, planetId);
    res.json(planet);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Initialize galaxy and start planets (admin/setup endpoint)
router.post('/initialize', async (req, res) => {
  try {
    const galaxy = await galaxyService.initializeGalaxy();
    const startPlanets = await galaxyService.createStartPlanets();
    
    res.json({
      message: 'Galaxy initialized successfully',
      galaxy,
      startPlanets: startPlanets.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
