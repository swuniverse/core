import prisma from '../lib/prisma';
import { getIo } from '../index';

/**
 * STU-Style Ship Movement Service
 * Runs every second to process ship movements in real-time
 */
class ShipMovementService {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    if (this.intervalId) return;

    console.log('🚀 Ship movement service started');
    
    // Run every second for smooth real-time movement
    this.intervalId = setInterval(() => {
      this.processMovements();
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Ship movement service stopped');
    }
  }

  private async processMovements() {
    try {
      // Get all ships currently in flight
      const shipsInFlight = await prisma.ship.findMany({
        where: {
          status: 'IN_FLIGHT',
          destinationX: { not: null },
          destinationY: { not: null },
        },
        include: {
          shipType: true,
          planet: {
            include: {
              player: true,
            },
          },
        },
      });

      for (const ship of shipsInFlight) {
        await this.moveShip(ship);
      }
    } catch (error) {
      console.error('Error processing ship movements:', error);
    }
  }

  private async moveShip(ship: any) {
    const { currentGalaxyX, currentGalaxyY, destinationX, destinationY } = ship;

    // Check if ship has reached destination
    if (currentGalaxyX === destinationX && currentGalaxyY === destinationY) {
      await prisma.ship.update({
        where: { id: ship.id },
        data: {
          status: 'DOCKED',
          destinationX: null,
          destinationY: null,
        },
      });

      // Emit arrival event
      if (ship.planet?.player?.id) {
        const io = getIo();
        io.to(`player:${ship.planet.player.id}`).emit('ship:arrived', {
          shipId: ship.id,
          x: destinationX,
          y: destinationY,
        });
      }

      console.log(`🛬 Ship ${ship.id} arrived at ${destinationX}|${destinationY}`);
      return;
    }

    // Check if ship has enough energy (1 energy per field)
    if (ship.energyDrive < 1) {
      // Ship is stranded!
      await prisma.ship.update({
        where: { id: ship.id },
        data: {
          status: 'STRANDED',
          destinationX: null,
          destinationY: null,
        },
      });

      // Emit stranded event
      if (ship.planet?.player?.id) {
        const io = getIo();
        io.to(`player:${ship.planet.player.id}`).emit('ship:stranded', {
          shipId: ship.id,
          x: currentGalaxyX,
          y: currentGalaxyY,
        });
      }

      console.log(`⚠️ Ship ${ship.id} stranded at ${currentGalaxyX}|${currentGalaxyY}`);
      return;
    }

    // Calculate next position (move 1 field towards destination)
    const dx = Math.sign(destinationX - currentGalaxyX);
    const dy = Math.sign(destinationY - currentGalaxyY);

    const newX = currentGalaxyX + dx;
    const newY = currentGalaxyY + dy;

    // Update ship position and consume energy (1 per field)
    await prisma.ship.update({
      where: { id: ship.id },
      data: {
        currentGalaxyX: newX,
        currentGalaxyY: newY,
        energyDrive: ship.energyDrive - 1,
      },
    });

    // Emit position update
    if (ship.planet?.player?.id) {
      const io = getIo();
      io.to(`player:${ship.planet.player.id}`).emit('ship:moved', {
        shipId: ship.id,
        x: newX,
        y: newY,
        energyDrive: ship.energyDrive - 1,
      });
    }
  }

  /**
   * Calculate how many fields a ship can reach with current drive energy
   * 1 energy = 1 field
   */
  calculateRange(ship: any): number {
    return ship.energyDrive;
  }

  /**
   * Calculate energy cost for a flight
   * Always 1 energy per field
   */
  calculateFlightCost(ship: any, targetX: number, targetY: number): number {
    const distance = Math.abs(targetX - ship.currentGalaxyX) + Math.abs(targetY - ship.currentGalaxyY);
    return distance; // 1 energy per field
  }
}

export const shipMovementService = new ShipMovementService();
