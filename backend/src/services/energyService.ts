import prisma from '../lib/prisma';

export class EnergyService {
  /**
   * Calculate energy storage capacity for a planet
   */
  async calculatePlanetEnergyCapacity(planetId: number): Promise<number> {
    const planet = await prisma.planet.findUnique({
      where: { id: planetId },
      include: {
        buildings: {
          where: {
            completedAt: { not: null },
          },
          include: {
            buildingType: true,
          },
        },
      },
    });

    if (!planet) {
      throw new Error('Planet not found');
    }

    // Base capacity 1000 + building bonuses
    let capacity = 1000;
    for (const building of planet.buildings) {
      // Check if building provides energy storage bonus
      capacity += building.buildingType.storageBonus * building.level;
    }

    return capacity;
  }

  /**
   * Check if planet has enough energy in storage for construction
   */
  async hasEnoughEnergyForConstruction(planetId: number, requiredEnergy: number): Promise<boolean> {
    const planet = await prisma.planet.findUnique({
      where: { id: planetId },
      select: { energyStorage: true },
    });

    if (!planet) {
      throw new Error('Planet not found');
    }

    return planet.energyStorage >= requiredEnergy;
  }

  /**
   * Deduct energy from planet storage (for construction)
   */
  async deductEnergy(planetId: number, amount: number): Promise<void> {
    await prisma.planet.update({
      where: { id: planetId },
      data: {
        energyStorage: {
          decrement: amount,
        },
      },
    });
  }

  /**
   * Calculate energy production and consumption per tick for a planet
   */
  async calculatePlanetEnergyBalance(planetId: number): Promise<{
    production: number;
    consumption: number;
    balance: number;
  }> {
    const planet = await prisma.planet.findUnique({
      where: { id: planetId },
      include: {
        buildings: {
          where: {
            completedAt: { not: null },
          },
          include: {
            buildingType: true,
          },
        },
      },
    });

    if (!planet) {
      throw new Error('Planet not found');
    }

    let production = 0;
    let consumption = 0;

    for (const building of planet.buildings) {
      production += building.buildingType.energyProduction * building.level;
      
      // Only active buildings consume energy
      if (building.isActive) {
        consumption += building.buildingType.energyCostPerTick * building.level;
      }
    }

    return {
      production,
      consumption,
      balance: production - consumption,
    };
  }
}

export const energyService = new EnergyService();
