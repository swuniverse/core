import prisma from '../lib/prisma';

let io: any = null;

export function setShipBuildIO(socketIO: any) {
  io = socketIO;
}

class ShipBuildService {
  /**
   * Runs every 10 seconds to check for completed ship constructions
   */
  async checkCompletedShips() {
    try {
      const queueItems = await prisma.shipBuildQueue.findMany({
        where: {
          completedAt: null,
        },
        include: {
          shipType: true,
          planet: {
            include: {
              player: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      for (const queue of queueItems) {
        const startTime = new Date(queue.constructionStartedAt).getTime();
        const buildTimeMs = queue.shipType.buildTime * 60 * 1000; // Convert minutes to milliseconds
        const now = Date.now();

        if (now >= startTime + buildTimeMs) {
          // Construction complete! Create the ships
          const ships = [];
          
          // Get planet with system info to set ship position
          const planet = await prisma.planet.findUnique({
            where: { id: queue.planetId },
            include: {
              system: {
                include: {
                  sector: true,
                },
              },
            },
          });

          if (!planet) {
            console.error(`Planet ${queue.planetId} not found for ship construction`);
            continue;
          }

          // Calculate ship's initial position (at planet in system)
          const systemCenterX = Math.floor(planet.system.gridSize / 2);
          const systemCenterY = Math.floor(planet.system.gridSize / 2);
          const galaxyX = (planet.system.sector.x - 1) * 20 + planet.system.fieldX;
          const galaxyY = (planet.system.sector.y - 1) * 20 + planet.system.fieldY;

          for (let i = 0; i < queue.quantity; i++) {
            const ship = await prisma.ship.create({
              data: {
                playerId: planet.playerId!,
                shipTypeId: queue.shipTypeId,
                planetId: queue.planetId,
                health: 100,
                crew: 0,
                // Set position at planet (in system)
                currentSystemId: planet.systemId,
                currentSystemX: systemCenterX,
                currentSystemY: systemCenterY,
                currentGalaxyX: galaxyX,
                currentGalaxyY: galaxyY,
                status: 'DOCKED',
              },
            });
            ships.push(ship);
          }

          // Mark queue item as completed
          await prisma.shipBuildQueue.update({
            where: { id: queue.id },
            data: { completedAt: new Date() },
          });

          console.log(`✓ Ship construction completed: ${queue.quantity}x ${queue.shipType.name} on planet ${queue.planetId}`);

          // Emit socket event to player
          if (queue.planet.player) {
            const socketRoom = `player:${queue.planet.player.userId}`;
            io.to(socketRoom).emit('ship:completed', {
              planetId: queue.planetId,
              shipType: queue.shipType,
              quantity: queue.quantity,
              ships,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking ship completions:', error);
    }
  }

  /**
   * Start the ship completion checker (runs every 10 seconds)
   */
  startCompletionChecker() {
    console.log('🚀 Ship completion service started');
    
    // Initial check
    this.checkCompletedShips();
    
    // Check every 10 seconds
    setInterval(() => {
      this.checkCompletedShips();
    }, 10000);
  }
}

export const shipBuildService = new ShipBuildService();
