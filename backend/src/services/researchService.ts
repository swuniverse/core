import prisma from '../lib/prisma';
import { io } from '../index';

export class ResearchService {
  /**
   * Process research progress during tick
   * - Calculate FP production from research labs
   * - Add FP to active research
   * - Complete research when enough FP accumulated
   */
  async processResearchTick() {
    console.log('Processing research progress...');

    // Get all players with active research
    const activeResearches = await prisma.playerResearch.findMany({
      where: {
        startedAt: { not: null },
        completedAt: null,
      },
      include: {
        player: true,
        researchType: true,
      },
    });

    for (const research of activeResearches) {
      // Handle Level 0 research (production-based, no resource deduction)
      if (research.researchType.researchLevel === 0) {
        // Get player's current production to calculate progress
        const planets = await prisma.planet.findMany({
          where: { playerId: research.playerId },
          include: {
            buildings: {
              where: { isActive: true, completedAt: { not: null } },
              include: { buildingType: true },
            },
          },
        });

        let productionPerTick = 0;
        let maxProgress = 0;
        let resourceType = '';
        
        // Calculate production based on which resource is required
        if (research.researchType.requiredDurastahlTotal) {
          resourceType = 'Durastahl';
          maxProgress = research.researchType.requiredDurastahlTotal;
          planets.forEach((planet) => {
            planet.buildings.forEach((building) => {
              productionPerTick += building.buildingType.durastahlProduction;
            });
          });
        } else if (research.researchType.requiredKristallinesSiliziumTotal) {
          resourceType = 'Kristall';
          maxProgress = research.researchType.requiredKristallinesSiliziumTotal;
          planets.forEach((planet) => {
            planet.buildings.forEach((building) => {
              productionPerTick += building.buildingType.kristallinesSiliziumProduction;
            });
          });
        } else if (research.researchType.requiredEnergyTotal) {
          resourceType = 'Energie';
          maxProgress = research.researchType.requiredEnergyTotal;
          planets.forEach((planet) => {
            planet.buildings.forEach((building) => {
              productionPerTick += building.buildingType.energyProduction;
            });
          });
        } else if (research.researchType.requiredCreditsTotal) {
          resourceType = 'Credits';
          maxProgress = research.researchType.requiredCreditsTotal;
          planets.forEach((planet) => {
            planet.buildings.forEach((building) => {
              productionPerTick += building.buildingType.creditProduction;
            });
          });
        }

        if (productionPerTick === 0) {
          console.log(`  Player ${research.playerId}: No ${resourceType} production for ${research.researchType.name}`);
          continue;
        }

        // Add production to progress (simulates time passing)
        const newProgress = research.currentProgress + productionPerTick;
        const isComplete = newProgress >= maxProgress;

        if (isComplete) {
          await prisma.playerResearch.update({
            where: { id: research.id },
            data: {
              currentProgress: maxProgress,
              completedAt: new Date(),
            },
          });

          console.log(`  ✅ Player ${research.playerId} completed Level 0 research: ${research.researchType.name}`);

          io.to(`player:${research.playerId}`).emit('research:completed', {
            researchId: research.id,
            researchName: research.researchType.name,
            unlocksBuilding: research.researchType.unlocksBuilding,
          });
        } else {
          await prisma.playerResearch.update({
            where: { id: research.id },
            data: {
              currentProgress: newProgress,
            },
          });

          console.log(`  Player ${research.playerId}: ${research.researchType.name} - ${newProgress}/${maxProgress} (${resourceType} production: +${productionPerTick}/tick)`);

          io.to(`player:${research.playerId}`).emit('research:progress', {
            researchId: research.id,
            progress: newProgress,
            maxProgress: maxProgress,
            productionGained: productionPerTick,
          });
        }

        continue;
      }

      // Get player's research labs to calculate FP production
      const planets = await prisma.planet.findMany({
        where: { playerId: research.playerId },
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

      // Count research labs (each produces 1 FP per tick)
      let fpProduction = 0;
      planets.forEach((planet) => {
        planet.buildings.forEach((building) => {
          if (building.buildingType.name === 'Forschungslabor') {
            fpProduction += 1; // 1 FP per lab per tick
          }
        });
      });

      if (fpProduction === 0) {
        console.log(`  Player ${research.playerId}: No research labs, research paused`);
        continue;
      }

      // Add FP to current progress
      const newProgress = research.currentProgress + fpProduction;
      const isComplete = newProgress >= research.researchType.researchPointCost;

      if (isComplete) {
        // Complete research
        await prisma.playerResearch.update({
          where: { id: research.id },
          data: {
            currentProgress: research.researchType.researchPointCost,
            completedAt: new Date(),
          },
        });

        console.log(`  ✅ Player ${research.playerId} completed research: ${research.researchType.name}`);

        // Emit socket event
        io.to(`player:${research.playerId}`).emit('research:completed', {
          researchId: research.id,
          researchName: research.researchType.name,
          unlocksBuilding: research.researchType.unlocksBuilding,
          unlocksShip: research.researchType.unlocksShip,
        });
      } else {
        // Update progress
        await prisma.playerResearch.update({
          where: { id: research.id },
          data: {
            currentProgress: newProgress,
          },
        });

        console.log(
          `  Player ${research.playerId}: ${research.researchType.name} - ${newProgress}/${research.researchType.researchPointCost} FP (+${fpProduction})`
        );

        // Emit progress update
        io.to(`player:${research.playerId}`).emit('research:progress', {
          researchId: research.id,
          progress: newProgress,
          maxProgress: research.researchType.researchPointCost,
          fpGained: fpProduction,
        });
      }
    }
  }

  /**
   * Check if player can build a specific building type
   */
  async canBuildBuilding(playerId: number, buildingTypeName: string): Promise<boolean> {
    // Check if building requires research
    const buildingType = await prisma.buildingType.findUnique({
      where: { name: buildingTypeName },
    });

    if (!buildingType || !buildingType.requiredResearch) {
      return true; // No research required
    }

    // Check if player has completed the required research
    const research = await prisma.researchType.findUnique({
      where: { id: buildingType.requiredResearch },
    });

    if (!research) {
      return true; // No valid research requirement
    }

    const playerResearch = await prisma.playerResearch.findFirst({
      where: {
        playerId: playerId,
        researchType: {
          unlocksBuilding: buildingTypeName,
        },
        completedAt: { not: null },
      },
    });

    return !!playerResearch;
  }

  /**
   * Get all buildings unlocked by player's completed research
   */
  async getUnlockedBuildings(playerId: number): Promise<string[]> {
    const completedResearch = await prisma.playerResearch.findMany({
      where: {
        playerId: playerId,
        completedAt: { not: null },
      },
      include: {
        researchType: true,
      },
    });

    const unlockedBuildings: string[] = [];
    completedResearch.forEach((research) => {
      if (research.researchType.unlocksBuilding) {
        unlockedBuildings.push(research.researchType.unlocksBuilding);
      }
    });

    return unlockedBuildings;
  }
}

export const researchService = new ResearchService();
