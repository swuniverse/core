import express from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();

/**
 * GET /api/shipyard/:planetId
 * Get available ship types and current build queue for a planet
 */
router.get('/:planetId', authMiddleware, async (req: any, res) => {
  try {
    const { planetId } = req.params;
    const playerId = req.player.id;

    // Verify planet ownership
    const planet = await prisma.planet.findFirst({
      where: {
        id: parseInt(planetId),
        playerId,
      },
      include: {
        buildings: {
          where: {
            buildingType: {
              name: 'Raumschiffwerft',
            },
            isActive: true,
          },
          include: {
            buildingType: true,
          },
        },
      },
    });

    if (!planet) {
      return res.status(404).json({ error: 'Planet nicht gefunden oder keine Berechtigung' });
    }

    // Check if planet has an active shipyard
    if (planet.buildings.length === 0) {
      return res.status(400).json({ error: 'Planet hat keine aktive Raumschiffwerft' });
    }

    // Get player's completed research to determine available ships
    const playerResearch = await prisma.playerResearch.findMany({
      where: {
        playerId,
        completedAt: { not: null },
      },
      include: {
        researchType: true,
      },
    });

    const completedResearchIds = playerResearch.map(pr => pr.researchType.id);

    // Get all ship types that don't require research OR have required research completed
    const availableShips = await prisma.shipType.findMany({
      where: {
        OR: [
          { requiredResearch: null },
          { requiredResearch: { in: completedResearchIds } },
        ],
      },
      orderBy: [
        { shipClass: 'asc' },
        { buildCost: 'asc' },
      ],
    });

    // Get current build queue
    const buildQueue = await prisma.shipBuildQueue.findMany({
      where: {
        planetId: parseInt(planetId),
        completedAt: null,
      },
      include: {
        shipType: true,
      },
      orderBy: {
        constructionStartedAt: 'asc',
      },
    });

    // Get ships stationed at this planet
    const ships = await prisma.ship.findMany({
      where: {
        planetId: parseInt(planetId),
        fleetId: null, // Not assigned to a fleet
      },
      include: {
        shipType: true,
      },
    });

    res.json({
      planet: {
        id: planet.id,
        name: planet.name,
        credits: planet.credits,
        durastahl: planet.durastahl,
        kristallinesSilizium: planet.kristallinesSilizium,
        tibannaGas: planet.tibannaGas,
        energiemodule: planet.energiemodule,
        kyberKristalle: planet.kyberKristalle,
        bacta: planet.bacta,
        beskar: planet.beskar,
      },
      availableShips,
      buildQueue,
      ships,
    });
  } catch (error) {
    console.error('Error fetching shipyard:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

/**
 * POST /api/shipyard/:planetId/build
 * Start building ships
 */
router.post('/:planetId/build', authMiddleware, async (req: any, res) => {
  try {
    const { planetId } = req.params;
    const { shipTypeId, quantity = 1 } = req.body;
    const playerId = req.player.id;

    if (!shipTypeId || quantity < 1) {
      return res.status(400).json({ error: 'Ungültige Eingabe' });
    }

    // Verify planet ownership and shipyard
    const planet = await prisma.planet.findFirst({
      where: {
        id: parseInt(planetId),
        playerId,
      },
      include: {
        buildings: {
          where: {
            buildingType: {
              name: 'Raumschiffwerft',
            },
            isActive: true,
          },
        },
      },
    });

    if (!planet) {
      return res.status(404).json({ error: 'Planet nicht gefunden' });
    }

    if (planet.buildings.length === 0) {
      return res.status(400).json({ error: 'Keine aktive Raumschiffwerft vorhanden' });
    }

    // Get ship type
    const shipType = await prisma.shipType.findUnique({
      where: { id: shipTypeId },
    });

    if (!shipType) {
      return res.status(404).json({ error: 'Schiffstyp nicht gefunden' });
    }

    // Check if research requirement is met
    if (shipType.requiredResearch) {
      const researchCompleted = await prisma.playerResearch.findFirst({
        where: {
          playerId,
          researchTypeId: shipType.requiredResearch,
          completedAt: { not: null },
        },
      });

      if (!researchCompleted) {
        return res.status(400).json({ error: 'Erforderliche Forschung nicht abgeschlossen' });
      }
    }

    // Calculate total costs
    const totalCredits = shipType.buildCost * quantity;
    const totalDurastahl = shipType.buildCostDurastahl * quantity;
    const totalKristallinesSilizium = shipType.buildCostKristallinesSilizium * quantity;
    const totalTibannaGas = shipType.buildCostTibannaGas * quantity;
    const totalEnergiemodule = shipType.buildCostEnergiemodule * quantity;
    const totalKyberKristalle = shipType.buildCostKyberKristalle * quantity;
    const totalBacta = shipType.buildCostBacta * quantity;
    const totalBeskar = shipType.buildCostBeskar * quantity;

    // Check resources
    if (
      planet.credits < totalCredits ||
      planet.durastahl < totalDurastahl ||
      planet.kristallinesSilizium < totalKristallinesSilizium ||
      planet.tibannaGas < totalTibannaGas ||
      planet.energiemodule < totalEnergiemodule ||
      planet.kyberKristalle < totalKyberKristalle ||
      planet.bacta < totalBacta ||
      planet.beskar < totalBeskar
    ) {
      return res.status(400).json({ error: 'Nicht genug Ressourcen' });
    }

    // Deduct resources and create build queue entry
    const updatedPlanet = await prisma.planet.update({
      where: { id: parseInt(planetId) },
      data: {
        credits: { decrement: totalCredits },
        durastahl: { decrement: totalDurastahl },
        kristallinesSilizium: { decrement: totalKristallinesSilizium },
        tibannaGas: { decrement: totalTibannaGas },
        energiemodule: { decrement: totalEnergiemodule },
        kyberKristalle: { decrement: totalKyberKristalle },
        bacta: { decrement: totalBacta },
        beskar: { decrement: totalBeskar },
      },
    });

    const queueEntry = await prisma.shipBuildQueue.create({
      data: {
        planetId: parseInt(planetId),
        shipTypeId,
        quantity,
      },
      include: {
        shipType: true,
      },
    });

    res.json({
      message: `${quantity}x ${shipType.name} werden gebaut`,
      queueEntry,
      planet: updatedPlanet,
    });
  } catch (error) {
    console.error('Error building ship:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

/**
 * DELETE /api/shipyard/:planetId/queue/:queueId
 * Cancel ship construction (50% refund)
 */
router.delete('/:planetId/queue/:queueId', authMiddleware, async (req: any, res) => {
  try {
    const { planetId, queueId } = req.params;
    const playerId = req.player.id;

    // Verify ownership
    const planet = await prisma.planet.findFirst({
      where: {
        id: parseInt(planetId),
        playerId,
      },
    });

    if (!planet) {
      return res.status(404).json({ error: 'Planet nicht gefunden' });
    }

    const queueEntry = await prisma.shipBuildQueue.findFirst({
      where: {
        id: parseInt(queueId),
        planetId: parseInt(planetId),
        completedAt: null,
      },
      include: {
        shipType: true,
      },
    });

    if (!queueEntry) {
      return res.status(404).json({ error: 'Bauauftrag nicht gefunden' });
    }

    // 50% refund
    const refundCredits = Math.floor(queueEntry.shipType.buildCost * queueEntry.quantity * 0.5);
    const refundDurastahl = Math.floor(queueEntry.shipType.buildCostDurastahl * queueEntry.quantity * 0.5);
    const refundKristallinesSilizium = Math.floor(queueEntry.shipType.buildCostKristallinesSilizium * queueEntry.quantity * 0.5);
    const refundTibannaGas = Math.floor(queueEntry.shipType.buildCostTibannaGas * queueEntry.quantity * 0.5);
    const refundEnergiemodule = Math.floor(queueEntry.shipType.buildCostEnergiemodule * queueEntry.quantity * 0.5);
    const refundKyberKristalle = Math.floor(queueEntry.shipType.buildCostKyberKristalle * queueEntry.quantity * 0.5);
    const refundBacta = Math.floor(queueEntry.shipType.buildCostBacta * queueEntry.quantity * 0.5);
    const refundBeskar = Math.floor(queueEntry.shipType.buildCostBeskar * queueEntry.quantity * 0.5);

    // Delete queue entry and refund resources
    await prisma.shipBuildQueue.delete({
      where: { id: parseInt(queueId) },
    });

    const updatedPlanet = await prisma.planet.update({
      where: { id: parseInt(planetId) },
      data: {
        credits: { increment: refundCredits },
        durastahl: { increment: refundDurastahl },
        kristallinesSilizium: { increment: refundKristallinesSilizium },
        tibannaGas: { increment: refundTibannaGas },
        energiemodule: { increment: refundEnergiemodule },
        kyberKristalle: { increment: refundKyberKristalle },
        bacta: { increment: refundBacta },
        beskar: { increment: refundBeskar },
      },
    });

    res.json({
      message: 'Bauauftrag abgebrochen (50% Rückerstattung)',
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
      planet: updatedPlanet,
    });
  } catch (error) {
    console.error('Error canceling ship construction:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;
