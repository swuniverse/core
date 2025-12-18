import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// Get all research types with player's progress
router.get('/available', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req as any;

    // Get all research types
    const allResearch = await prisma.researchType.findMany({
      orderBy: [
        { researchLevel: 'asc' },
        { researchPointCost: 'asc' },
      ],
    });

    // Get player's research progress
    const playerResearch = await prisma.playerResearch.findMany({
      where: { playerId: user.player.id },
      include: {
        researchType: true,
      },
    });

    // Get player's planets to check production requirements
    const planets = await prisma.planet.findMany({
      where: { playerId: user.player.id },
      include: {
        buildings: {
          where: {
            isActive: true,
            completedAt: { not: null },
          },
          include: {
            buildingType: true,
          },
        },
      },
    });

    // Calculate total production across all planets
    let totalCreditsPerTick = 0;
    let totalDurastahlPerTick = 0;
    let totalKristallinesSiliziumPerTick = 0;
    let totalEnergyProduction = 0;
    let totalLabCount = 0;

    planets.forEach((planet) => {
      planet.buildings.forEach((building) => {
        totalCreditsPerTick += building.buildingType.creditProduction;
        totalDurastahlPerTick += building.buildingType.durastahlProduction;
        totalKristallinesSiliziumPerTick += building.buildingType.kristallinesSiliziumProduction;
        totalEnergyProduction += building.buildingType.energyProduction;
        
        if (building.buildingType.name === 'Forschungslabor') {
          totalLabCount++;
        }
      });
    });

    // Map research with availability status
    const researchWithStatus = allResearch.map((research) => {
      const playerProgress = playerResearch.find((pr) => pr.researchTypeId === research.id);
      
      // Check if completed
      if (playerProgress?.completedAt) {
        return {
          ...research,
          status: 'completed',
          progress: research.researchPointCost,
          maxProgress: research.researchPointCost,
        };
      }

      // Check if in progress
      if (playerProgress?.startedAt && !playerProgress.completedAt) {
        return {
          ...research,
          status: 'in_progress',
          progress: playerProgress.currentProgress,
          maxProgress: research.researchPointCost,
        };
      }

      // Check if available (Level 0 - production based)
      if (research.researchLevel === 0) {
        // Check if player has enough production per tick
        let productionPerTick = 0;
        let requiredProduction = 0;
        let required = 0;
        let resourceType = '';

        if (research.requiredDurastahlTotal) {
          resourceType = 'Durastahl';
          required = research.requiredDurastahlTotal;
          requiredProduction = research.requiredDurastahlPerTick || 0;
          productionPerTick = totalDurastahlPerTick;
        } else if (research.requiredKristallinesSiliziumTotal) {
          resourceType = 'Kristall';
          required = research.requiredKristallinesSiliziumTotal;
          requiredProduction = research.requiredKristallinesSiliziumPerTick || 0;
          productionPerTick = totalKristallinesSiliziumPerTick;
        } else if (research.requiredEnergyTotal) {
          resourceType = 'Energie';
          required = research.requiredEnergyTotal;
          requiredProduction = research.requiredEnergyPerTick || 0;
          productionPerTick = totalEnergyProduction;
        } else if (research.requiredCreditsTotal) {
          resourceType = 'Credits';
          required = research.requiredCreditsTotal;
          requiredProduction = research.requiredCreditsPerTick || 0;
          productionPerTick = totalCreditsPerTick;
        }

        const hasEnoughProduction = productionPerTick >= requiredProduction;
        const estimatedTicks = productionPerTick > 0 ? Math.ceil(required / productionPerTick) : 999;

        return {
          ...research,
          status: hasEnoughProduction ? 'available' : 'locked',
          progress: 0,
          maxProgress: required,
          productionRequirement: {
            type: resourceType,
            required: requiredProduction,
            current: productionPerTick,
            estimatedTicks: estimatedTicks,
          },
        };
      }

      // Check if available (Level 1+ - FP based)
      const hasEnoughLabs = totalLabCount >= research.requiredLabCount;
      const prerequisiteMet = !research.prerequisiteId || 
        playerResearch.some((pr) => pr.researchTypeId === research.prerequisiteId && pr.completedAt);

      const isAvailable = hasEnoughLabs && prerequisiteMet;

      return {
        ...research,
        status: isAvailable ? 'available' : 'locked',
        progress: 0,
        maxProgress: research.researchPointCost,
        labCount: totalLabCount,
        requiredLabCount: research.requiredLabCount,
      };
    });

    res.json({
      research: researchWithStatus,
      playerStats: {
        labCount: totalLabCount,
        production: {
          credits: totalCreditsPerTick,
          durastahl: totalDurastahlPerTick,
          kristallinesSilizium: totalKristallinesSiliziumPerTick,
          energy: totalEnergyProduction,
        },
      },
    });
  } catch (error: any) {
    console.error('Research available error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start a research
router.post('/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req as any;
    const { researchTypeId } = req.body;

    if (!researchTypeId) {
      return res.status(400).json({ error: 'Research type ID required' });
    }

    // Check if research exists
    const researchType = await prisma.researchType.findUnique({
      where: { id: researchTypeId },
    });

    if (!researchType) {
      return res.status(404).json({ error: 'Research type not found' });
    }

    // Check if already completed or in progress
    const existing = await prisma.playerResearch.findUnique({
      where: {
        playerId_researchTypeId: {
          playerId: user.player.id,
          researchTypeId: researchTypeId,
        },
      },
    });

    if (existing?.completedAt) {
      return res.status(400).json({ error: 'Research already completed' });
    }

    if (existing?.startedAt && !existing.completedAt) {
      return res.status(400).json({ error: 'Research already in progress' });
    }

    // Check if another research is active
    const activeResearch = await prisma.playerResearch.findFirst({
      where: {
        playerId: user.player.id,
        startedAt: { not: null },
        completedAt: null,
      },
    });

    if (activeResearch) {
      return res.status(400).json({ error: 'Another research is already in progress' });
    }

    // Check production/lab requirements based on level
    if (researchType.researchLevel === 0) {
      // Level 0: Check if player has enough production per tick
      const planets = await prisma.planet.findMany({
        where: { playerId: user.player.id },
        include: {
          buildings: {
            where: { isActive: true, completedAt: { not: null } },
            include: { buildingType: true },
          },
        },
      });

      let productionPerTick = 0;
      let requiredProduction = 0;

      if (researchType.requiredDurastahlTotal) {
        requiredProduction = researchType.requiredDurastahlPerTick || 0;
        planets.forEach((p) => {
          p.buildings.forEach((b) => {
            productionPerTick += b.buildingType.durastahlProduction;
          });
        });
      } else if (researchType.requiredKristallinesSiliziumTotal) {
        requiredProduction = researchType.requiredKristallinesSiliziumPerTick || 0;
        planets.forEach((p) => {
          p.buildings.forEach((b) => {
            productionPerTick += b.buildingType.kristallinesSiliziumProduction;
          });
        });
      } else if (researchType.requiredEnergyTotal) {
        requiredProduction = researchType.requiredEnergyPerTick || 0;
        planets.forEach((p) => {
          p.buildings.forEach((b) => {
            productionPerTick += b.buildingType.energyProduction;
          });
        });
      } else if (researchType.requiredCreditsTotal) {
        requiredProduction = researchType.requiredCreditsPerTick || 0;
        planets.forEach((p) => {
          p.buildings.forEach((b) => {
            productionPerTick += b.buildingType.creditProduction;
          });
        });
      }

      if (productionPerTick < requiredProduction) {
        return res.status(400).json({ 
          error: `Nicht genügend Produktion. Benötigt: ${requiredProduction}/Tick, Verfügbar: ${productionPerTick}/Tick` 
        });
      }
    } else {
      // Level 1+: Check lab requirements
      const labCount = await prisma.building.count({
        where: {
          planet: { playerId: user.player.id },
          buildingType: { name: 'Forschungslabor' },
          isActive: true,
          completedAt: { not: null },
        },
      });

      if (labCount < researchType.requiredLabCount) {
        return res.status(400).json({ error: 'Nicht genügend Forschungslabore' });
      }
    }

    // Start research (for all levels)
    const research = await prisma.playerResearch.create({
      data: {
        playerId: user.player.id,
        researchTypeId: researchTypeId,
        currentProgress: 0,
        startedAt: new Date(),
      },
      include: {
        researchType: true,
      },
    });

    res.json({ message: 'Forschung gestartet', research });
  } catch (error: any) {
    console.error('Start research error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active research
router.get('/active', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req as any;

    const activeResearch = await prisma.playerResearch.findFirst({
      where: {
        playerId: user.player.id,
        startedAt: { not: null },
        completedAt: null,
      },
      include: {
        researchType: true,
      },
    });

    res.json({ research: activeResearch });
  } catch (error: any) {
    console.error('Active research error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
