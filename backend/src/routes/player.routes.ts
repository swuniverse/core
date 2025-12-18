import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { inviteService } from '../services/inviteService';

const router = Router();

router.get('/profile', authMiddleware, (req, res) => {
  res.json({ message: 'Player profile - to be implemented' });
});

// Dashboard overview - all player data in one request
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req as any;

    console.log('Dashboard request - user:', user?.id, 'player:', user?.player?.id);

    if (!user?.player?.id) {
      console.log('No player found, returning empty dashboard');
      return res.status(200).json({ 
        planets: [],
        activeConstructions: [],
        totals: {
          credits: 0,
          durastahl: 0,
          kristallinesSilizium: 0,
          tibannaGas: 0,
          energiemodule: 0,
          kyberKristalle: 0,
          bacta: 0,
          beskar: 0,
          energy: 0,
          maxEnergy: 0,
          storage: 0,
        },
        production: {
          credits: 0,
          durastahl: 0,
          kristallinesSilizium: 0,
          tibannaGas: 0,
          energiemodule: 0,
          kyberKristalle: 0,
          bacta: 0,
          beskar: 0,
          energy: 0,
        },
      });
    }

    // Get all planets with their resources and buildings
    const planets = await prisma.planet.findMany({
      where: { playerId: user.player.id },
      include: {
        system: {
          include: {
            sector: true,
          },
        },
        buildings: {
          where: { completedAt: { not: null } },
          include: {
            buildingType: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    console.log(`Found ${planets.length} planets for player ${user.player.id}`);
    if (planets.length > 0) {
      console.log('First planet:', planets[0].name, planets[0].id);
    }

    // Get active construction projects
    const activeConstructions = await prisma.building.findMany({
      where: {
        planet: { playerId: user.player.id },
        completedAt: null,
      },
      include: {
        buildingType: true,
        planet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { constructionStartedAt: 'asc' },
    });

    // Get active research
    const activeResearch = await prisma.playerResearch.findMany({
      where: {
        playerId: user.player.id,
        completedAt: null,
      },
      include: {
        researchType: {
          select: {
            name: true,
            category: true,            researchLevel: true,
            requiredEnergyTotal: true,
            requiredDurastahlTotal: true,
            requiredKristallinesSiliziumTotal: true,
            requiredCreditsTotal: true,          },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    // Calculate total production across all planets
    let totalCredits = 0;
    let totalDurastahl = 0;
    let totalKristallinesSilizium = 0;
    let totalTibannaGas = 0;
    let totalEnergiemodule = 0;
    let totalKyberKristalle = 0;
    let totalBacta = 0;
    let totalBeskar = 0;
    let totalEnergy = 0;
    let totalMaxEnergy = 0;
    let totalStorage = 0;
    
    let creditProduction = 0;
    let durastahlProduction = 0;
    let kristallinesSiliziumProduction = 0;
    let tibannaGasProduction = 0;
    let energiemoduleProduction = 0;
    let kyberKristalleProduction = 0;
    let bactaProduction = 0;
    let beskarProduction = 0;
    let energyProduction = 0;
    let energyConsumption = 0;

    planets.forEach((planet) => {
      totalCredits += planet.credits;
      totalDurastahl += planet.durastahl;
      totalKristallinesSilizium += planet.kristallinesSilizium;
      totalTibannaGas += planet.tibannaGas;
      totalEnergiemodule += planet.energiemodule;
      totalKyberKristalle += planet.kyberKristalle;
      totalBacta += planet.bacta;
      totalBeskar += planet.beskar;
      totalEnergy += planet.energy;
      totalMaxEnergy += planet.maxEnergy;
      totalStorage += planet.storageCapacity;

      // Calculate production from active buildings
      planet.buildings.forEach((building) => {
        if (building.isActive) {
          creditProduction += building.buildingType.creditProduction;
          durastahlProduction += building.buildingType.durastahlProduction;
          kristallinesSiliziumProduction += building.buildingType.kristallinesSiliziumProduction;
          tibannaGasProduction += building.buildingType.tibannaGasProduction;
          energiemoduleProduction += building.buildingType.energiemoduleProduction;
          kyberKristalleProduction += building.buildingType.kyberKristalleProduction;
          bactaProduction += building.buildingType.bactaProduction;
          beskarProduction += building.buildingType.beskarProduction;
          energyProduction += building.buildingType.energyProduction;
          energyConsumption += building.buildingType.energyCost;
        }
      });
    });

    res.json({
      planets: planets.map((planet) => ({
        id: planet.id,
        name: planet.name,
        planetType: planet.planetType,
        orbitRadius: planet.orbitRadius,
        orbitAngle: planet.orbitAngle,
        system: {
          id: planet.system.id,
          name: planet.system.name,
          systemType: planet.system.systemType,
          fieldX: planet.system.fieldX,
          fieldY: planet.system.fieldY,
        },
        sector: {
          x: planet.system.sector.x,
          y: planet.system.sector.y,
        },
        resources: {
          credits: planet.credits,
          durastahl: planet.durastahl,
          kristallinesSilizium: planet.kristallinesSilizium,
          tibannaGas: planet.tibannaGas,
          energiemodule: planet.energiemodule,
          kyberKristalle: planet.kyberKristalle,
          bacta: planet.bacta,
          beskar: planet.beskar,
          energy: planet.energy,
          maxEnergy: planet.maxEnergy,
          storageCapacity: planet.storageCapacity,
        },
        buildingCount: planet.buildings.length,
      })),
      activeConstructions: activeConstructions.map((building) => ({
        id: building.id,
        buildingName: building.buildingType.name,
        planetId: building.planet.id,
        planetName: building.planet.name,
        startedAt: building.constructionStartedAt,
        completesAt: new Date(
          building.constructionStartedAt.getTime() + building.buildingType.buildTime * 60 * 1000
        ),
      })),
      activeResearch: activeResearch.map((research) => {
        // Determine resource type for Level 0 research
        let resourceType = 'FP'; // Default for Level 1+
        if (research.researchType.researchLevel === 0) {
          if (research.researchType.requiredEnergyTotal) resourceType = 'Energie';
          else if (research.researchType.requiredDurastahlTotal) resourceType = 'Durastahl';
          else if (research.researchType.requiredKristallinesSiliziumTotal) resourceType = 'Kristall';
          else if (research.researchType.requiredCreditsTotal) resourceType = 'Credits';
        }
        
        return {
          id: research.id,
          researchTypeName: research.researchType.name,
          category: research.researchType.category,
          progress: research.currentProgress,
          maxProgress: research.maxProgress,
          resourceType: resourceType,
        };
      }),
      totals: {
        credits: totalCredits,
        durastahl: totalDurastahl,
        kristallinesSilizium: totalKristallinesSilizium,
        tibannaGas: totalTibannaGas,
        energiemodule: totalEnergiemodule,
        kyberKristalle: totalKyberKristalle,
        bacta: totalBacta,
        beskar: totalBeskar,
        energy: totalEnergy,
        maxEnergy: totalMaxEnergy,
        storage: totalStorage,
      },
      production: {
        credits: creditProduction,
        durastahl: durastahlProduction,
        kristallinesSilizium: kristallinesSiliziumProduction,
        tibannaGas: tibannaGasProduction,
        energiemodule: energiemoduleProduction,
        kyberKristalle: kyberKristalleProduction,
        bacta: bactaProduction,
        beskar: beskarProduction,
        energy: energyProduction - energyConsumption,
      },
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get player's invite codes
router.get('/invite-codes', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await inviteService.getInviteStats(req.userId!);
    res.json(stats);
  } catch (error: any) {
    console.error('Invite codes error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
