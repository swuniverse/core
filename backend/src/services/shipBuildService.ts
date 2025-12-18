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
          for (let i = 0; i < queue.quantity; i++) {
            const ship = await prisma.ship.create({
              data: {
                shipTypeId: queue.shipTypeId,
                planetId: queue.planetId,
                health: 100,
                crew: 0,
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
