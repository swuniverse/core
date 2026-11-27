import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { GameDataService } from '../game-data/game-data.service';
import { ANOMALY_MASS_BY_CLASS } from './anomaly-mass';

@Injectable()
export class ShipClassService {
  constructor(
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    @InjectRepository(FactionEntity)
    private readonly factionRepo: Repository<FactionEntity>,
    private readonly gameData: GameDataService,
  ) {}

  /**
   * Ship classes whose key changed. The deploy starts the new backend before the
   * migration container runs, so the rename must also happen here, ahead of the upsert:
   * otherwise the seeder creates the new key as a second row and existing ships stay behind.
   */
  private static readonly LEGACY_KEYS: Array<[string, string]> = [
    ['REBEL_FREIGHTER_YT', 'REBEL_FREIGHTER_HAWK'],
    ['EMPIRE_FREIGHTER_GOZANTI', 'EMPIRE_FREIGHTER_ZETA'],
    ['EMPIRE_FREIGHTER_IMPERIAL', 'EMPIRE_FREIGHTER_ETA'],
    ['EMPIRE_FREIGHTER_HEAVY', 'EMPIRE_FREIGHTER_MOSE'],
    // Corvette/frigate line-up (STU class names retired): the 410 hulls are corvettes,
    // the 910 hulls frigates. Renaming keeps ids, so existing ships follow.
    ['REBEL_ESCORT_HAMMERHEAD', 'REBEL_CORVETTE_HAMMERHEAD'],
    ['REBEL_FRIGATE_PELTA', 'REBEL_CORVETTE_DEFENDER'],
    ['REBEL_SCOUT_HWK_290', 'REBEL_CORVETTE_BRAHATOK'],
    ['REBEL_CORVETTE_CR90', 'REBEL_FRIGATE_CR90'],
    ['REBEL_CRUISER_NEBULON_B', 'REBEL_FRIGATE_NEBULON_B'],
    ['EMPIRE_FRIGATE_LANCER', 'EMPIRE_CORVETTE_RENDILI'],
    ['EMPIRE_SCOUT_RAIDER', 'EMPIRE_CORVETTE_LISTENER'],
    // Fighter line-up: A-Wing becomes the Y-Wing, the LAAT slot becomes the B-Wing.
    ['REBEL_FIGHTER_A_WING', 'REBEL_FIGHTER_Y_WING'],
    ['REBEL_SHUTTLE_LAAT', 'REBEL_FIGHTER_B_WING'],
  ];

  private async renameLegacyKeys(): Promise<void> {
    for (const [oldKey, newKey] of ShipClassService.LEGACY_KEYS) {
      const legacy = await this.shipClassRepo.findOne({ where: { key: oldKey } });
      if (!legacy) continue;
      const fresh = await this.shipClassRepo.findOne({ where: { key: newKey } });
      if (fresh) {
        try {
          // A row created by an earlier seed run has no references yet.
          await this.shipClassRepo.delete({ id: fresh.id });
        } catch {
          continue;
        }
      }
      await this.shipClassRepo.update({ id: legacy.id }, { key: newKey });
    }
  }

  async seedDefaults(): Promise<void> {
    await this.renameLegacyKeys();
    const factions = await this.factionRepo.find();
    const factionMap = new Map(factions.map((f) => [f.key, f.id]));

    for (const [key, anomalyMass] of Object.entries(ANOMALY_MASS_BY_CLASS)) {
      await this.shipClassRepo.update({ key }, { anomalyMass });
    }
    const yamlDefs = this.gameData.getShipClassDefs();
    const activeKeys = yamlDefs.map((def) => def.key);
    if (activeKeys.length > 0) {
      await this.shipClassRepo.update(
        { key: Not(In(activeKeys)) },
        { isNpc: true, starterAllowed: false },
      );
    }
    for (const def of yamlDefs) {
      const definition = {
        key: def.key,
        name: def.name,
        category: def.category,
        role: def.role,
        factionId: def.factionKey ? (factionMap.get(def.factionKey) ?? null) : null,
        unlockTechId: def.unlockTechId,
        buildTimeTicks: def.buildTimeTicks,
        anomalyMass: ANOMALY_MASS_BY_CLASS[def.key] ?? null,
        cargoCapacity: def.cargoCapacity,
        crewMin: def.crewMin,
        crewMax: def.crewMax,
        hullBase: def.hullBase,
        shieldBase: def.shieldBase,
        epsBase: def.epsBase,
        batteryBase: def.batteryBase,
        reactorBase: def.reactorBase,
        warpdriveBase: def.warpdriveBase,
        evadeBase: def.evadeBase,
        hitChanceBase: def.hitChanceBase,
        sensorRangeBase: def.sensorRangeBase,
        torpedoStorageBase: def.torpedoStorageBase,
        flightEnergyCost: def.flightEnergyCost,
        prestige: def.prestige,
        shuttleSlots: def.shuttleSlots ?? 0,
        starterAllowed: def.starterAllowed,
        isNpc: def.isNpc,
        isColonizer: def.isColonizer ?? false,
        colonizerTier: def.colonizerTier ?? null,
        colonizationBuildingId: def.colonizationBuildingId ?? null,
      };

      const existing = await this.shipClassRepo.findOne({
        where: { key: definition.key },
      });

      if (existing) {
        Object.assign(existing, definition);
        await this.shipClassRepo.save(existing);
      } else {
        await this.shipClassRepo.save(this.shipClassRepo.create(definition));
      }
    }
  }


  findAll(): Promise<ShipClassDef[]> {
    return this.shipClassRepo.find({
      where: { isNpc: false },
      order: { id: 'ASC' },
    });
  }

  findById(id: number): Promise<ShipClassDef | null> {
    return this.shipClassRepo.findOneBy({ id });
  }
}
