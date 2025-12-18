import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// Get all available building types (filtered by player research)
router.get('/building-types/all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req as any;
    const playerId = user.player?.id;

    if (!playerId) {
      return res.status(400).json({ error: 'Player not found' });
    }

    // Get all building types
    const allBuildingTypes = await prisma.buildingType.findMany({
      orderBy: { category: 'asc' },
    });

    // Get completed research for this player
    const completedResearch = await prisma.playerResearch.findMany({
      where: {
        playerId,
        completedAt: { not: null },
      },
      include: {
        researchType: true,
      },
    });

    // Get list of unlocked building names
    const unlockedBuildings = new Set<string>();
    completedResearch.forEach(pr => {
      if (pr.researchType.unlocksBuilding) {
        unlockedBuildings.add(pr.researchType.unlocksBuilding);
      }
    });

    // Check if building types need research to unlock
    const researchTypes = await prisma.researchType.findMany({
      where: {
        unlocksBuilding: { not: null },
      },
    });

    const buildingsRequiringResearch = new Set(
      researchTypes.map(rt => rt.unlocksBuilding).filter(b => b !== null) as string[]
    );

    // Filter: Show building if it doesn't require research OR if it's unlocked
    const availableBuildingTypes = allBuildingTypes.filter(bt => {
      // If no research required for this building, show it
      if (!buildingsRequiringResearch.has(bt.name)) {
        return true;
      }
      // If research required, only show if unlocked
      return unlockedBuildings.has(bt.name);
    });

    res.json(availableBuildingTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:planetId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const planetId = parseInt(req.params.planetId);
    const { user } = req as any;

    const planet = await prisma.planet.findUnique({
      where: { id: planetId },
      include: {
        system: {
          include: {
            sector: true,
          },
        },
        player: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
            faction: true,
          },
        },
        fields: {
          include: {
            building: {
              include: {
                buildingType: true,
              },
            },
          },
          orderBy: [
            { y: 'asc' },
            { x: 'asc' },
          ],
        },
        buildings: {
          include: {
            buildingType: true,
          },
        },
      },
    });

    if (!planet) {
      return res.status(404).json({ error: 'Planet nicht gefunden' });
    }

    // Check if player owns this planet or if it's unclaimed
    if (planet.playerId && planet.playerId !== user.player?.id) {
      // Don't show full details of other players' planets
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    // Calculate production rates from active buildings
    let production = {
      credits: 0,
      durastahl: 0,
      kristallinesSilizium: 0,
      tibannaGas: 0,
      energiemodule: 0,
      kyberKristalle: 0,
      bacta: 0,
      beskar: 0,
    };

    for (const building of planet.buildings) {
      if (building.isActive && building.completedAt) {
        production.credits += building.buildingType.creditProduction * building.level;
        production.durastahl += building.buildingType.durastahlProduction * building.level;
        production.kristallinesSilizium += building.buildingType.kristallinesSiliziumProduction * building.level;
        production.tibannaGas += building.buildingType.tibannaGasProduction * building.level;
        production.energiemodule += building.buildingType.energiemoduleProduction * building.level;
        production.kyberKristalle += building.buildingType.kyberKristalleProduction * building.level;
        production.bacta += building.buildingType.bactaProduction * building.level;
        production.beskar += building.buildingType.beskarProduction * building.level;
      }
    }

    res.json({ ...planet, production });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rename planet
router.patch('/:planetId/rename', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const planetId = parseInt(req.params.planetId);
    const { name } = req.body;
    const { user } = req as any;

    if (!name || name.trim().length < 1 || name.trim().length > 50) {
      return res.status(400).json({ error: 'Planet name must be between 1 and 50 characters' });
    }

    // Verify planet ownership
    const planet = await prisma.planet.findUnique({
      where: { id: planetId },
    });

    if (!planet || planet.playerId !== user.player?.id) {
      return res.status(403).json({ error: 'You do not own this planet' });
    }

    // Update planet name
    const updatedPlanet = await prisma.planet.update({
      where: { id: planetId },
      data: { name: name.trim() },
    });

    res.json({ message: 'Planet renamed successfully', planet: updatedPlanet });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:planetId/build', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const planetId = parseInt(req.params.planetId);
    const { buildingTypeId, fieldId } = req.body;
    const { user } = req as any;

    // Verify planet ownership
    const planet = await prisma.planet.findUnique({
      where: { id: planetId },
    });

    if (!planet || planet.playerId !== user.player?.id) {
      return res.status(403).json({ error: 'You do not own this planet' });
    }

    // Verify field is available
    const field = await prisma.planetField.findUnique({
      where: { id: fieldId },
      include: { building: true },
    });

    if (!field || field.planetId !== planetId) {
      return res.status(400).json({ error: 'Ungültiges Feld' });
    }

    if (field.buildingId) {
      return res.status(400).json({ error: 'Feld hat bereits ein Gebäude' });
    }

    if (field.fieldType !== 'LAND') {
      return res.status(400).json({ error: 'Kann nur auf LAND-Feldern gebaut werden' });
    }

    // Get building type
    const buildingType = await prisma.buildingType.findUnique({
      where: { id: buildingTypeId },
    });

    if (!buildingType) {
      return res.status(400).json({ error: 'Ungültiger Gebäudetyp' });
    }

    // Check if Kommandozentrale already exists on this planet (can only have 1)
    if (buildingType.name === 'Kommandozentrale') {
      const existingCommandCenter = await prisma.building.findFirst({
        where: {
          planetId,
          buildingTypeId: buildingType.id,
        },
      });

      if (existingCommandCenter) {
        return res.status(400).json({ error: 'Kommandozentrale existiert bereits auf diesem Planeten. Nur eine pro Planet erlaubt.' });
      }
    }

    // Check if planet has enough resources
    if (planet.credits < buildingType.buildCostCredits) {
      return res.status(400).json({ error: `Nicht genügend Credits. Benötigt: ${buildingType.buildCostCredits}, vorhanden: ${planet.credits}` });
    }

    if (planet.durastahl < buildingType.buildCostDurastahl) {
      return res.status(400).json({ error: `Nicht genügend Durastahl. Benötigt: ${buildingType.buildCostDurastahl}, vorhanden: ${planet.durastahl}` });
    }

    if (planet.kristallinesSilizium < buildingType.buildCostKristallinesSilizium) {
      return res.status(400).json({ error: `Nicht genügend Kristallines Silizium. Benötigt: ${buildingType.buildCostKristallinesSilizium}, vorhanden: ${planet.kristallinesSilizium}` });
    }

    if (planet.tibannaGas < buildingType.buildCostTibannaGas) {
      return res.status(400).json({ error: `Nicht genügend Tibanna-Gas. Benötigt: ${buildingType.buildCostTibannaGas}, vorhanden: ${planet.tibannaGas}` });
    }

    if (planet.energiemodule < buildingType.buildCostEnergiemodule) {
      return res.status(400).json({ error: `Nicht genügend Energiemodule. Benötigt: ${buildingType.buildCostEnergiemodule}, vorhanden: ${planet.energiemodule}` });
    }

    if (planet.kyberKristalle < buildingType.buildCostKyberKristalle) {
      return res.status(400).json({ error: `Nicht genügend Kyber-Kristalle. Benötigt: ${buildingType.buildCostKyberKristalle}, vorhanden: ${planet.kyberKristalle}` });
    }

    if (planet.bacta < buildingType.buildCostBacta) {
      return res.status(400).json({ error: `Nicht genügend Bacta. Benötigt: ${buildingType.buildCostBacta}, vorhanden: ${planet.bacta}` });
    }

    if (planet.beskar < buildingType.buildCostBeskar) {
      return res.status(400).json({ error: `Nicht genügend Beskar. Benötigt: ${buildingType.buildCostBeskar}, vorhanden: ${planet.beskar}` });
    }

    // Check if planet has enough energy in storage
    if (planet.energyStorage < buildingType.energyCostToBuild) {
      return res.status(400).json({ 
        error: `Nicht genügend Energie im Speicher. Benötigt: ${buildingType.energyCostToBuild}, vorhanden: ${planet.energyStorage}` 
      });
    }

    // Create building (not completed yet)
    const building = await prisma.building.create({
      data: {
        planetId,
        buildingTypeId,
        level: 1,
        isActive: false,
        // completedAt will be set by tick system after buildTime
      },
      include: {
        buildingType: true,
      },
    });

    // Assign building to field
    await prisma.planetField.update({
      where: { id: fieldId },
      data: { buildingId: building.id },
    });

    // Deduct resources from planet
    const updatedPlanet = await prisma.planet.update({
      where: { id: planetId },
      data: {
        credits: { decrement: buildingType.buildCostCredits },
        durastahl: { decrement: buildingType.buildCostDurastahl },
        kristallinesSilizium: { decrement: buildingType.buildCostKristallinesSilizium },
        tibannaGas: { decrement: buildingType.buildCostTibannaGas },
        energiemodule: { decrement: buildingType.buildCostEnergiemodule },
        kyberKristalle: { decrement: buildingType.buildCostKyberKristalle },
        bacta: { decrement: buildingType.buildCostBacta },
        beskar: { decrement: buildingType.buildCostBeskar },
        energyStorage: { decrement: buildingType.energyCostToBuild },
      },
    });

    res.json({ 
      message: 'Building construction started',
      building,
      remainingResources: {
        credits: updatedPlanet.credits,
        durastahl: updatedPlanet.durastahl,
        kristallinesSilizium: updatedPlanet.kristallinesSilizium,
        tibannaGas: updatedPlanet.tibannaGas,
        energiemodule: updatedPlanet.energiemodule,
        kyberKristalle: updatedPlanet.kyberKristalle,
        bacta: updatedPlanet.bacta,
        beskar: updatedPlanet.beskar,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:planetId/building/:buildingId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const planetId = parseInt(req.params.planetId);
    const buildingId = parseInt(req.params.buildingId);
    const { user } = req as any;

    // Verify planet ownership
    const planet = await prisma.planet.findUnique({
      where: { id: planetId },
    });

    if (!planet || planet.playerId !== user.player?.id) {
      return res.status(403).json({ error: 'You do not own this planet' });
    }

    // Get building with type
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { buildingType: true },
    });

    if (!building || building.planetId !== planetId) {
      return res.status(400).json({ error: 'Building not found on this planet' });
    }

    // Calculate refund (50% of build costs)
    const refundCredits = Math.floor(building.buildingType.buildCostCredits * 0.5);
    const refundDurastahl = Math.floor(building.buildingType.buildCostDurastahl * 0.5);
    const refundKristallinesSilizium = Math.floor(building.buildingType.buildCostKristallinesSilizium * 0.5);
    const refundTibannaGas = Math.floor(building.buildingType.buildCostTibannaGas * 0.5);
    const refundEnergiemodule = Math.floor(building.buildingType.buildCostEnergiemodule * 0.5);
    const refundKyberKristalle = Math.floor(building.buildingType.buildCostKyberKristalle * 0.5);
    const refundBacta = Math.floor(building.buildingType.buildCostBacta * 0.5);
    const refundBeskar = Math.floor(building.buildingType.buildCostBeskar * 0.5);

    // Remove building from field
    await prisma.planetField.updateMany({
      where: { buildingId: building.id },
      data: { buildingId: null },
    });

    // Delete building
    await prisma.building.delete({
      where: { id: buildingId },
    });

    // Refund resources to planet (capped at storage capacity)
    const currentPlanet = await prisma.planet.findUnique({ where: { id: planetId } });
    if (!currentPlanet) {
      return res.status(400).json({ error: 'Planet not found' });
    }

    await prisma.planet.update({
      where: { id: planetId },
      data: {
        credits: Math.min(currentPlanet.credits + refundCredits, currentPlanet.storageCapacity),
        durastahl: Math.min(currentPlanet.durastahl + refundDurastahl, currentPlanet.storageCapacity),
        kristallinesSilizium: Math.min(currentPlanet.kristallinesSilizium + refundKristallinesSilizium, currentPlanet.storageCapacity),
        tibannaGas: Math.min(currentPlanet.tibannaGas + refundTibannaGas, currentPlanet.storageCapacity),
        energiemodule: Math.min(currentPlanet.energiemodule + refundEnergiemodule, currentPlanet.storageCapacity),
        kyberKristalle: Math.min(currentPlanet.kyberKristalle + refundKyberKristalle, currentPlanet.storageCapacity),
        bacta: Math.min(currentPlanet.bacta + refundBacta, currentPlanet.storageCapacity),
        beskar: Math.min(currentPlanet.beskar + refundBeskar, currentPlanet.storageCapacity),
      },
    });

    res.json({
      message: 'Building demolished',
      refund: {
        credits: refundCredits,
        durastahl: refundDurastahl,
        kristallinesSilizium: refundKristallinesSilizium,
        tibannaGas: refundTibannaGas,
        energiemodule: refundEnergiemodule,
        kyberKristalle: refundKyberKristalle,
        bacta: refundBacta,
        beskar: refundBeskar,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
