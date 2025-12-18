import prisma from '../lib/prisma';
import { io } from '../index';
import { emitToPlayer } from '../socket';

export class BuildingCompletionService {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_FREQUENCY = 10000; // Check every 10 seconds

  start() {
    console.log('🏗️  Building completion service started');
    
    this.checkInterval = setInterval(() => {
      this.checkCompletedBuildings();
    }, this.CHECK_FREQUENCY);

    // Run immediately on start
    this.checkCompletedBuildings();
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkCompletedBuildings() {
    try {
      const now = new Date();

      // Find buildings that are not active, not completed, but should be done by now
      const underConstruction = await prisma.building.findMany({
        where: {
          isActive: false,
          completedAt: null,
        },
        include: {
          buildingType: true,
          planet: {
            include: {
              player: true,
            },
          },
        },
      });

      for (const building of underConstruction) {
        const constructionStart = new Date(building.constructionStartedAt);
        const buildTimeMs = building.buildingType.buildTime * 60 * 1000; // Convert minutes to milliseconds
        const completionTime = new Date(constructionStart.getTime() + buildTimeMs);

        if (now >= completionTime) {
          // Building is complete!
          await prisma.building.update({
            where: { id: building.id },
            data: {
              isActive: true,
              completedAt: now,
            },
          });

          console.log(`  ✅ Building ${building.buildingType.name} (Level ${building.level}) completed on planet ${building.planetId}`);

          // Notify player via Socket.IO
          if (building.planet.playerId) {
            emitToPlayer(io, building.planet.playerId, 'building:completed', {
              buildingId: building.id,
              buildingName: building.buildingType.name,
              planetId: building.planetId,
              planetName: building.planet.name,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking completed buildings:', error);
    }
  }
}

export const buildingCompletionService = new BuildingCompletionService();
