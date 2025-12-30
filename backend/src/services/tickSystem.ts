import { io } from '../index';
import { emitToPlayer } from '../socket';
import redis from '../lib/redis';
import prisma from '../lib/prisma';
import * as cron from 'node-cron';
import { researchService } from './researchService';
import logger from '../lib/logger';

export class TickSystem {
  private tickNumber: number = 0;
  private cronJob: cron.ScheduledTask | null = null;

  async start() {
    // Load last tick number from Redis
    const lastTick = await redis.get('game:tick:current');
    this.tickNumber = lastTick ? parseInt(lastTick) : 0;

    logger.tick(`⏰ Starting tick system at tick ${this.tickNumber}`);
    logger.tick(`📅 Ticks run at: 12:00, 15:00, 18:00, 21:00, 00:00 (Europe/Berlin)`);
    
    // Run at 12:00, 15:00, 18:00, 21:00, 00:00 every day
    // Cron format: minute hour * * *
    this.cronJob = cron.schedule('0 0,12,15,18,21 * * *', async () => {
      await this.processTick();
    }, {
      timezone: 'Europe/Berlin'
    });

    logger.tick(`✅ Tick system scheduled`);
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.tick('⏰ Tick system stopped');
    }
  }

  async processTick() {
    this.tickNumber++;
    console.log(`⏰ Processing tick ${this.tickNumber}`);

    try {
      // Save current tick to Redis
      await redis.set('game:tick:current', this.tickNumber.toString());

      // Process game mechanics (buildings completion is now real-time)
      await this.processEnergyBalance();
      await this.processResearch();
      await this.processFleets();
      await this.processResources();

      // Notify all players
      io.emit('tick:update', {
        tick: this.tickNumber,
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ Tick ${this.tickNumber} completed`);
    } catch (error) {
      console.error(`Error processing tick ${this.tickNumber}:`, error);
    }
  }

  private async processEnergyBalance() {
    console.log('Processing energy production and consumption per planet...');
    
    // Get all colonized planets with their buildings
    const planets = await prisma.planet.findMany({
      where: {
        playerId: { not: null },
      },
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

    for (const planet of planets) {
      let energyProduction = 0;
      let energyConsumption = 0;
      let energyStorageCapacity = 1000; // Base capacity
      let resourceStorageCapacity = 500; // Base from Command Center

      // Calculate energy production, consumption and storage capacities
      for (const building of planet.buildings) {
        energyProduction += building.buildingType.energyProduction * building.level;
        // Energy storage grows with energy-producing buildings (simplified)
        if (building.buildingType.energyProduction > 0) {
          energyStorageCapacity += 100 * building.level;
        }
        resourceStorageCapacity += building.buildingType.storageBonus * building.level;
        
        // Only active buildings consume energy
        if (building.isActive) {
          energyConsumption += building.buildingType.energyCostPerTick * building.level;
        }
      }

      const energyBalance = energyProduction - energyConsumption;
      let newEnergyStorage = planet.energyStorage + energyBalance;

      // Cap at storage capacity
      if (newEnergyStorage > energyStorageCapacity) {
        newEnergyStorage = energyStorageCapacity;
      }

      // If energy would go negative, deactivate buildings
      if (newEnergyStorage < 0 && planet.playerId) {
        console.log(`  Planet ${planet.name}: Energy storage depleted! Deactivating buildings...`);
        
        // Deactivate buildings starting with highest consumers (except power plants)
        const energyConsumers = planet.buildings
          .filter((b: any) => b.isActive && b.buildingType.energyCostPerTick > 0 && b.buildingType.energyProduction === 0)
          .sort((a: any, b: any) => b.buildingType.energyCostPerTick - a.buildingType.energyCostPerTick);

        let currentConsumption = energyConsumption;
        
        for (const building of energyConsumers) {
          await prisma.building.update({
            where: { id: building.id },
            data: { isActive: false },
          });

          currentConsumption -= building.buildingType.energyCostPerTick * building.level;
          const newBalance = energyProduction - currentConsumption;
          newEnergyStorage = planet.energyStorage + newBalance;
          
          console.log(`    Deactivated ${building.buildingType.name} (saved ${building.buildingType.energyCostPerTick} energy/tick)`);
          
          if (newEnergyStorage >= 0) {
            break;
          }
        }

        // Ensure storage doesn't go negative
        if (newEnergyStorage < 0) {
          newEnergyStorage = 0;
        }

        // Notify player
        emitToPlayer(io, planet.playerId, 'energy:deficit', {
          planetId: planet.id,
          planetName: planet.name,
          energyStorage: newEnergyStorage,
          message: `Energiespeicher leer auf ${planet.name}! Gebäude wurden deaktiviert.`,
        });
      }

      // Update planet energy storage and capacity
      await prisma.planet.update({
        where: { id: planet.id },
        data: {
          energyStorage: newEnergyStorage,
          energyStorageCapacity: energyStorageCapacity,
          storageCapacity: resourceStorageCapacity,
        },
      });

      console.log(`  Planet ${planet.name}: Energie ${newEnergyStorage}/${energyStorageCapacity} (${energyBalance > 0 ? '+' : ''}${energyBalance}/Tick)`);
    }
  }

  private async processResearch() {
    await researchService.processResearchTick();
  }

  private async processFleets() {
    // TODO: Move fleets, process combat
    console.log('Processing fleets...');
  }

  private async processResources() {
    console.log('Processing resources per planet...');
    
    // Get all colonized planets with their active buildings
    const planets = await prisma.planet.findMany({
      where: {
        playerId: { not: null },
      },
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

    for (const planet of planets) {
      let creditProduction = 0;
      let durastahlProduction = 0;
      let kristallinesSiliziumProduction = 0;
      let tibannaGasProduction = 0;
      let energiemoduleProduction = 0;
      let kyberKristalleProduction = 0;
      let bactaProduction = 0;
      let beskarProduction = 0;

      // Calculate production from all active buildings on this planet
      for (const building of planet.buildings) {
        creditProduction += building.buildingType.creditProduction * building.level;
        durastahlProduction += building.buildingType.durastahlProduction * building.level;
        kristallinesSiliziumProduction += building.buildingType.kristallinesSiliziumProduction * building.level;
        tibannaGasProduction += building.buildingType.tibannaGasProduction * building.level;
        energiemoduleProduction += building.buildingType.energiemoduleProduction * building.level;
        kyberKristalleProduction += building.buildingType.kyberKristalleProduction * building.level;
        bactaProduction += building.buildingType.bactaProduction * building.level;
        beskarProduction += building.buildingType.beskarProduction * building.level;
      }

      // Calculate current storage usage (all resources)
      const currentStorage = planet.credits + planet.durastahl + planet.kristallinesSilizium + 
                            planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + 
                            planet.bacta + planet.beskar;
      const availableStorage = planet.storageCapacity - currentStorage;

      // All resources: Cap at storage limit
      let creditGain = creditProduction;
      let durastahlGain = durastahlProduction;
      let kristallGain = kristallinesSiliziumProduction;
      let tibannaGasGain = tibannaGasProduction;
      let energiemoduleGain = energiemoduleProduction;
      let kyberKristalleGain = kyberKristalleProduction;
      let bactaGain = bactaProduction;
      let beskarGain = beskarProduction;

      // Distribute available storage proportionally if not enough space
      const totalProduction = creditGain + durastahlGain + kristallGain + tibannaGasGain + 
                              energiemoduleGain + kyberKristalleGain + bactaGain + beskarGain;
      
      if (totalProduction > availableStorage) {
        if (totalProduction > 0) {
          creditGain = Math.floor((creditGain / totalProduction) * availableStorage);
          durastahlGain = Math.floor((durastahlGain / totalProduction) * availableStorage);
          kristallGain = Math.floor((kristallGain / totalProduction) * availableStorage);
          tibannaGasGain = Math.floor((tibannaGasGain / totalProduction) * availableStorage);
          energiemoduleGain = Math.floor((energiemoduleGain / totalProduction) * availableStorage);
          kyberKristalleGain = Math.floor((kyberKristalleGain / totalProduction) * availableStorage);
          bactaGain = Math.floor((bactaGain / totalProduction) * availableStorage);
          beskarGain = Math.floor((beskarGain / totalProduction) * availableStorage);
        } else {
          creditGain = durastahlGain = kristallGain = tibannaGasGain = 
          energiemoduleGain = kyberKristalleGain = bactaGain = beskarGain = 0;
        }
      }

      const newCredits = planet.credits + creditGain;
      const newDurastahl = planet.durastahl + durastahlGain;
      const newKristallinesSilizium = planet.kristallinesSilizium + kristallGain;
      const newTibannaGas = planet.tibannaGas + tibannaGasGain;
      const newEnergiemodule = planet.energiemodule + energiemoduleGain;
      const newKyberKristalle = planet.kyberKristalle + kyberKristalleGain;
      const newBacta = planet.bacta + bactaGain;
      const newBeskar = planet.beskar + beskarGain;

      // Update planet resources
      await prisma.planet.update({
        where: { id: planet.id },
        data: {
          credits: newCredits,
          durastahl: newDurastahl,
          kristallinesSilizium: newKristallinesSilizium,
          tibannaGas: newTibannaGas,
          energiemodule: newEnergiemodule,
          kyberKristalle: newKyberKristalle,
          bacta: newBacta,
          beskar: newBeskar,
        },
      });
      
      const finalStorage = currentStorage + creditGain + durastahlGain + kristallGain + tibannaGasGain + energiemoduleGain + kyberKristalleGain + bactaGain + beskarGain;
      console.log(`  Planet ${planet.name}: +${creditGain}/${creditProduction} credits, +${durastahlGain}/${durastahlProduction} durastahl, +${kristallGain}/${kristallinesSiliziumProduction} kristall (${finalStorage}/${planet.storageCapacity} storage)`);
      
      // Notify player of resource update for this planet
      if (planet.playerId) {
        emitToPlayer(io, planet.playerId, 'resources:updated', {
          planetId: planet.id,
          planetName: planet.name,
          credits: newCredits,
          durastahl: newDurastahl,
          kristallinesSilizium: newKristallinesSilizium,
          tibannaGas: newTibannaGas,
          energiemodule: newEnergiemodule,
          kyberKristalle: newKyberKristalle,
          bacta: newBacta,
          beskar: newBeskar,
          production: {
            credits: creditProduction,
            durastahl: durastahlProduction,
            kristallinesSilizium: kristallinesSiliziumProduction,
            tibannaGas: tibannaGasProduction,
            energiemodule: energiemoduleProduction,
            kyberKristalle: kyberKristalleProduction,
            bacta: bactaProduction,
            beskar: beskarProduction,
          },
          gained: {
            credits: creditGain,
            durastahl: durastahlGain,
            kristallinesSilizium: kristallGain,
            tibannaGas: tibannaGasGain,
            energiemodule: energiemoduleGain,
            kyberKristalle: kyberKristalleGain,
            bacta: bactaGain,
            beskar: beskarGain,
          },
        });
      }
    }
  }

  getCurrentTick(): number {
    return this.tickNumber;
  }
}

export const tickSystem = new TickSystem();
