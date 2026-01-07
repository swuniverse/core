import prisma from '../lib/prisma';
import { getIo } from '../index';

/**
 * STU-Style Ship Movement Service
 * Supports two navigation layers:
 * 1. Hyperspace (120x120) - when currentSystemId is null
 * 2. System (20x30) - when ship is inside a system
 * Runs every second to process ship movements in real-time
 */
class ShipMovementService {
  private intervalId: NodeJS.Timeout | null = null;
  
  // Galaxy/Hyperspace constants
  private readonly GALAXY_SIZE_X = 120;
  private readonly GALAXY_SIZE_Y = 120;
  
  // System constants  
  private readonly SYSTEM_MIN_SIZE = 20;
  private readonly SYSTEM_MAX_SIZE = 40;

  start() {
    if (this.intervalId) return;

    console.log('🚀 Ship movement service started (dual-layer navigation)');
    
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
          system: true,
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
    // Determine which layer the ship is on
    const isInHyperspace = ship.currentSystemId === null;
    
    if (isInHyperspace) {
      await this.moveInHyperspace(ship);
    } else {
      await this.moveInSystem(ship);
    }
  }

  /**
   * Move ship in hyperspace (120x120 galaxy grid)
   */
  private async moveInHyperspace(ship: any) {
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
          layer: 'hyperspace',
        });
      }

      console.log(`🛬 Ship ${ship.id} arrived in hyperspace at ${destinationX}|${destinationY}`);
      return;
    }

    // Check if ship has enough energy (1 energy per field in hyperspace)
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
          layer: 'hyperspace',
        });
      }

      console.log(`⚠️ Ship ${ship.id} stranded in hyperspace at ${currentGalaxyX}|${currentGalaxyY}`);
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
        layer: 'hyperspace',
      });
    }
  }

  /**
   * Move ship within a system (20x30 local grid)
   */
  private async moveInSystem(ship: any) {
    const { currentSystemX, currentSystemY, destinationX, destinationY } = ship;

    // Check if ship has reached destination within system
    if (currentSystemX === destinationX && currentSystemY === destinationY) {
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
          layer: 'system',
        });
      }

      console.log(`🛬 Ship ${ship.id} arrived in system at ${destinationX}|${destinationY}`);
      return;
    }

    // In-system movement uses less energy (0.5 per field)
    const energyCostPerField = 0.5;
    
    if (ship.energyDrive < energyCostPerField) {
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
          x: currentSystemX,
          y: currentSystemY,
          layer: 'system',
        });
      }

      console.log(`⚠️ Ship ${ship.id} stranded in system at ${currentSystemX}|${currentSystemY}`);
      return;
    }

    // Calculate next position (move 1 field towards destination)
    const dx = Math.sign(destinationX - currentSystemX);
    const dy = Math.sign(destinationY - currentSystemY);

    const newX = currentSystemX + dx;
    const newY = currentSystemY + dy;

    // Update ship position and consume energy (0.5 per field in system)
    await prisma.ship.update({
      where: { id: ship.id },
      data: {
        currentSystemX: newX,
        currentSystemY: newY,
        energyDrive: { decrement: energyCostPerField },
      },
    });

    // Emit position update
    if (ship.planet?.player?.id) {
      const io = getIo();
      io.to(`player:${ship.planet.player.id}`).emit('ship:moved', {
        shipId: ship.id,
        x: newX,
        y: newY,
        energyDrive: ship.energyDrive - energyCostPerField,
        layer: 'system',
      });
    }
  }

  /**
   * Universal move function - automatically detects navigation layer
   * @param shipId - Ship ID
   * @param targetX - Target X coordinate
   * @param targetY - Target Y coordinate
   * @returns Movement result with energy cost and validation
   */
  async move(shipId: number, targetX: number, targetY: number): Promise<{
    success: boolean;
    message: string;
    energyCost?: number;
    layer?: 'hyperspace' | 'system';
  }> {
    try {
      const ship = await prisma.ship.findUnique({
        where: { id: shipId },
        include: {
          shipType: true,
          system: true,
        },
      });

      if (!ship) {
        return { success: false, message: 'Schiff nicht gefunden' };
      }

      // Check if ship can move
      if (ship.status === 'IN_FLIGHT') {
        return { success: false, message: 'Schiff bereits im Flug' };
      }

      // Determine layer
      const isInHyperspace = ship.currentSystemId === null;
      const layer = isInHyperspace ? 'hyperspace' : 'system';

      // Validate coordinates and calculate cost based on layer
      let energyCost: number;
      let validationResult: { valid: boolean; message?: string };

      if (isInHyperspace) {
        validationResult = this.validateHyperspaceCoordinates(targetX, targetY);
        if (!validationResult.valid) {
          return { success: false, message: validationResult.message! };
        }
        
        const currentX = ship.currentGalaxyX || 0;
        const currentY = ship.currentGalaxyY || 0;
        energyCost = this.calculateHyperspaceCost(currentX, currentY, targetX, targetY);
      } else {
        const systemGridSize = ship.system?.gridSize || 30;
        validationResult = this.validateSystemCoordinates(targetX, targetY, systemGridSize);
        if (!validationResult.valid) {
          return { success: false, message: validationResult.message! };
        }
        
        const currentX = ship.currentSystemX || 0;
        const currentY = ship.currentSystemY || 0;
        energyCost = this.calculateSystemCost(currentX, currentY, targetX, targetY);
      }

      // Check energy availability
      if (ship.energyDrive < energyCost) {
        return {
          success: false,
          message: `Nicht genug Energie. Benötigt: ${energyCost}, Verfügbar: ${ship.energyDrive}`,
          energyCost,
          layer,
        };
      }

      // Start movement
      const updateData: any = {
        status: 'IN_FLIGHT',
        destinationX: targetX,
        destinationY: targetY,
      };

      await prisma.ship.update({
        where: { id: shipId },
        data: updateData,
      });

      return {
        success: true,
        message: `Flug gestartet (${layer})`,
        energyCost,
        layer,
      };
    } catch (error) {
      console.error('Move error:', error);
      return { success: false, message: 'Interner Fehler bei der Bewegung' };
    }
  }

  /**
   * Validate hyperspace coordinates
   */
  private validateHyperspaceCoordinates(x: number, y: number): { valid: boolean; message?: string } {
    if (x < 0 || x >= this.GALAXY_SIZE_X || y < 0 || y >= this.GALAXY_SIZE_Y) {
      return {
        valid: false,
        message: `Koordinaten außerhalb der Galaxie (0-${this.GALAXY_SIZE_X - 1}, 0-${this.GALAXY_SIZE_Y - 1})`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate system coordinates
   */
  private validateSystemCoordinates(x: number, y: number, gridSize: number): { valid: boolean; message?: string } {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
      return {
        valid: false,
        message: `Koordinaten außerhalb des Systems (0-${gridSize - 1})`,
      };
    }
    return { valid: true };
  }

  /**
   * Calculate hyperspace energy cost (1 energy per field)
   */
  private calculateHyperspaceCost(fromX: number, fromY: number, toX: number, toY: number): number {
    const distance = Math.abs(toX - fromX) + Math.abs(toY - fromY);
    return distance; // 1 energy per field
  }

  /**
   * Calculate system energy cost (0.5 energy per field)
   */
  private calculateSystemCost(fromX: number, fromY: number, toX: number, toY: number): number {
    const distance = Math.abs(toX - fromX) + Math.abs(toY - fromY);
    return distance * 0.5; // 0.5 energy per field in system
  }

  /**
   * Calculate how many fields a ship can reach with current drive energy
   * Takes into account the current layer
   */
  calculateRange(ship: any): number {
    const isInHyperspace = ship.currentSystemId === null;
    if (isInHyperspace) {
      return ship.energyDrive; // 1:1 in hyperspace
    } else {
      return ship.energyDrive * 2; // 2:1 in system (0.5 energy per field)
    }
  }

  /**
   * Calculate energy cost for a flight
   */
  calculateFlightCost(ship: any, targetX: number, targetY: number): number {
    const isInHyperspace = ship.currentSystemId === null;
    
    if (isInHyperspace) {
      const currentX = ship.currentGalaxyX || 0;
      const currentY = ship.currentGalaxyY || 0;
      return this.calculateHyperspaceCost(currentX, currentY, targetX, targetY);
    } else {
      const currentX = ship.currentSystemX || 0;
      const currentY = ship.currentSystemY || 0;
      return this.calculateSystemCost(currentX, currentY, targetX, targetY);
    }
  }
}

export const shipMovementService = new ShipMovementService();
