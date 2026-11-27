import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Crew, CrewType } from '../colony/entities/crew.entity';
import { GameDataService } from '../game-data/game-data.service';
import { OrderBroadcastService } from '../order-broadcast/order-broadcast.service';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { initializeSpacecraftRuntimeSystems } from '../spacecraft/spacecraft-runtime-state.service';
import { createSmallCraft } from '../spacecraft/small-craft-launch';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { ShipGift } from './entities/ship-gift.entity';
import { SHIP_GIFT_MESSAGE, SHIP_GIFTS, type ShipGiftDef } from './ship-gifts';

export type ShipGiftResult = 'granted' | 'already-granted' | 'no-colony';

/**
 * Hands out the story gift ships (first colony, landing platform research) and
 * reports each one with a player-only order message. Rows in `ship_gifts` make
 * every gift happen once per player, so the start-up backfill is idempotent.
 */
@Injectable()
export class ShipGiftService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ShipGiftService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly gameData: GameDataService,
    private readonly orders: OrderBroadcastService,
  ) {}

  /** Retroactive grant for everyone who already qualifies. */
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.backfill();
    } catch (error) {
      this.logger.error(
        `Ship gift backfill failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async backfill(): Promise<number> {
    let granted = 0;
    for (const gift of SHIP_GIFTS) {
      const userIds =
        gift.trigger.type === 'FIRST_COLONY'
          ? await this.usersWithColony(gift.key)
          : await this.usersWithResearch(gift.key, gift.trigger.techIds);
      for (const userId of userIds) {
        if ((await this.grant(userId, gift.key)) === 'granted') granted++;
      }
    }
    if (granted > 0)
      this.logger.log(`Granted ${granted} gift ships retroactively`);
    await this.crewUncrewedGifts();
    return granted;
  }

  /** Scouts were first handed out without a crew; man the ones still empty. */
  private async crewUncrewedGifts(): Promise<void> {
    const keys = SHIP_GIFTS.filter((gift) => gift.moduleCommodityIds).map(
      (gift) => gift.key,
    );
    const gifts = await this.dataSource
      .getRepository(ShipGift)
      .createQueryBuilder('g')
      .where('g."giftKey" IN (:...keys)', { keys })
      .andWhere('g."spacecraftId" IS NOT NULL')
      .getMany();
    for (const gift of gifts) {
      await this.dataSource.transaction(async (manager) => {
        const ship = await manager
          .getRepository(Spacecraft)
          .findOneBy({ id: gift.spacecraftId! });
        if (ship && ship.crew === 0) {
          await this.addMinimumCrew(manager, ship, gift.userId);
        }
      });
    }
  }

  onFirstColony(userId: number): Promise<ShipGiftResult[]> {
    return this.grantTrigger(
      userId,
      (gift) => gift.trigger.type === 'FIRST_COLONY',
    );
  }

  onResearchCompleted(
    userId: number,
    techId: number,
  ): Promise<ShipGiftResult[]> {
    return this.grantTrigger(
      userId,
      (gift) =>
        gift.trigger.type === 'RESEARCH' &&
        gift.trigger.techIds.includes(techId),
    );
  }

  private async grantTrigger(
    userId: number,
    matches: (gift: ShipGiftDef) => boolean,
  ): Promise<ShipGiftResult[]> {
    const results: ShipGiftResult[] = [];
    for (const gift of SHIP_GIFTS.filter(matches)) {
      results.push(await this.grant(userId, gift.key));
    }
    return results;
  }

  async grant(userId: number, giftKey: string): Promise<ShipGiftResult> {
    const gift = SHIP_GIFTS.find((entry) => entry.key === giftKey);
    if (!gift) throw new Error(`Unknown ship gift ${giftKey}`);
    const outcome = await this.dataSource.transaction(async (manager) => {
      if (await manager.getRepository(ShipGift).existsBy({ userId, giftKey })) {
        return 'already-granted' as const;
      }
      const colony = await manager.getRepository(Colony).findOne({
        where: { userId },
        order: { createdAt: 'ASC', id: 'ASC' },
      });
      if (!colony?.systemFieldId) return 'no-colony' as const;
      const location = await manager
        .getRepository(SpaceLocation)
        .findOneBy({ systemFieldId: colony.systemFieldId });
      const hull = await manager
        .getRepository(ShipClassDef)
        .findOneBy({ key: gift.shipClassKey });
      if (!location || !hull) return 'no-colony' as const;
      const ship = await createSmallCraft(
        manager,
        hull,
        { name: hull.name, userId, locationId: location.id, location },
        this.gameData,
        gift.moduleCommodityIds,
      );
      await this.addMinimumCrew(manager, ship, userId);
      await this.bringOnline(manager, ship);
      await manager
        .getRepository(ShipGift)
        .insert({ userId, giftKey, spacecraftId: ship.id });
      return 'granted' as const;
    });
    if (outcome === 'granted') {
      await this.orders.send(SHIP_GIFT_MESSAGE, userId);
    }
    return outcome;
  }

  /** Crewed gift hulls arrive with their minimum crew aboard. */
  private async addMinimumCrew(
    manager: EntityManager,
    ship: Spacecraft,
    userId: number,
  ): Promise<void> {
    const missing = Math.min(ship.crewRequired, ship.crewMax) - ship.crew;
    if (missing <= 0) return;
    const crewRepo = manager.getRepository(Crew);
    const assignmentRepo = manager.getRepository(CrewAssignment);
    for (let index = 0; index < missing; index++) {
      const member = await crewRepo.save(
        crewRepo.create({
          userId,
          name: `Besatzung ${ship.id}-${ship.crew + index + 1}`,
          type: CrewType.CREWMAN,
        }),
      );
      await assignmentRepo.save(
        assignmentRepo.create({
          crewId: member.id,
          userId,
          colonyId: null,
          spacecraftId: ship.id,
          slot: CrewType.CREWMAN,
        }),
      );
    }
    ship.crew += missing;
    await manager.getRepository(Spacecraft).save(ship);
  }

  /** Gift ships arrive ready to fly: full shields, every installed system running. */
  private async bringOnline(manager: EntityManager, ship: Spacecraft) {
    const systems = initializeSpacecraftRuntimeSystems(ship);
    for (const state of Object.values(systems)) {
      if (state) {
        state.active = true;
        state.integrity = 100;
        state.cooldown = 0;
      }
    }
    // Drives and sensors stay off until the pilot switches them on.
    for (const key of [
      'WARPDRIVE',
      'SUBLIGHT_DRIVE',
      'TRACTOR_BEAM',
      'LONG_RANGE_SENSORS',
      'SHORT_RANGE_SENSORS',
    ] as const) {
      if (systems[key]) systems[key] = { ...systems[key]!, active: false };
    }
    ship.runtimeSystems = systems;
    ship.shields = ship.shieldsMax;
    if (systems.SHIELDS)
      systems.SHIELDS = { ...systems.SHIELDS, current: ship.shieldsMax };
    await manager.getRepository(Spacecraft).save(ship);
  }

  private async usersWithColony(giftKey: string): Promise<number[]> {
    const rows: Array<{ userId: number }> = await this.dataSource.query(
      `SELECT DISTINCT c."userId" FROM colonies c
       WHERE c."userId" IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM ship_gifts g WHERE g."userId" = c."userId" AND g."giftKey" = $1)
       ORDER BY c."userId"`,
      [giftKey],
    );
    return rows.map((row) => row.userId);
  }

  private async usersWithResearch(
    giftKey: string,
    techIds: number[],
  ): Promise<number[]> {
    const rows: Array<{ userId: number }> = await this.dataSource
      .getRepository(Research)
      .createQueryBuilder('r')
      .select('DISTINCT r."userId"', 'userId')
      .where('r."techId" IN (:...techIds)', { techIds })
      .andWhere('r.status = :status', { status: ResearchStatus.COMPLETED })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM ship_gifts g WHERE g."userId" = r."userId" AND g."giftKey" = :giftKey)`,
        { giftKey },
      )
      .orderBy('r."userId"')
      .getRawMany();
    return rows.map((row) => row.userId);
  }
}
