import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { DataSource, EntityManager } from 'typeorm';
import { FieldEffect } from '@swuniverse/shared';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { User } from '../auth/user.entity';
import { PrestigeService } from '../prestige/prestige.service';
import { Anomaly } from './entities/anomaly.entity';
import { AnomalyType } from './entities/anomaly-type.entity';
import { addDays, berlinDay, easterSunday } from './seasonal-calendar';

export const SEASONAL_TYPES = {
  LIFE_DAY_GIFT: {
    name: 'Lebenstag-Geschenk',
    commodityId: 60,
    commodityName: 'Lebenstag-Marke',
  },
  SPRING_CAPSULE: {
    name: 'Frühlings-Kapsel',
    commodityId: 73,
    commodityName: 'Frühlings-Kapsel',
  },
} as const;
export type SeasonalKey = keyof typeof SEASONAL_TYPES;
interface SeasonalData {
  year: number;
  opensOn: string;
  expiresOn: string;
  lastMovedOn: string;
}

@Injectable()
export class SeasonalAnomalyService {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly prestige: PrestigeService,
    private readonly now: () => Date = () => new Date(),
    private readonly random: () => number = Math.random,
  ) {}

  enabled(): boolean {
    return this.config.get('SEASONAL_ANOMALIES_ENABLED') !== 'false';
  }
  private data(anomaly: Anomaly): SeasonalData | null {
    const data = anomaly.data as Partial<SeasonalData> | null;
    return data &&
      typeof data.year === 'number' &&
      typeof data.opensOn === 'string' &&
      typeof data.expiresOn === 'string'
      ? (data as SeasonalData)
      : null;
  }
  active(anomaly: Anomaly): boolean {
    const data = this.data(anomaly),
      today = berlinDay(this.now());
    return (
      this.enabled() &&
      !!data &&
      today >= data.opensOn &&
      today < data.expiresOn
    );
  }

  @Cron('0 0 0 * * *', { timeZone: 'Europe/Berlin' })
  async generate(): Promise<void> {
    if (!this.enabled()) return;
    await this.db.transaction(async (manager) => {
      await this.lock(manager);
      for (const key of Object.keys(SEASONAL_TYPES) as SeasonalKey[])
        await this.checkForCreation(manager, key);
    });
  }
  private lock(manager: EntityManager) {
    // Same order as the framework tick, so opens cannot race creation/movement/expiry.
    return manager.query(
      "SELECT pg_advisory_xact_lock(hashtext('swu_anomaly_tick'))",
    );
  }

  async checkForCreation(
    manager: EntityManager,
    key: SeasonalKey,
  ): Promise<void> {
    if (!this.enabled()) return;
    const today = berlinDay(this.now()),
      year = Number(today.slice(0, 4));
    const opensOn =
      key === 'LIFE_DAY_GIFT' ? `${year}-12-01` : easterSunday(year);
    const expiresOn =
      key === 'LIFE_DAY_GIFT' ? `${year}-12-25` : addDays(opensOn, 7);
    // Advent catches up after a missed midnight; spring creation is Easter Sunday only.
    if (
      key === 'LIFE_DAY_GIFT'
        ? today < opensOn || today >= expiresOn
        : today !== opensOn
    )
      return;
    if (
      (
        await manager.query(
          'SELECT 1 FROM seasonal_anomaly_runs WHERE key = $1 AND year = $2',
          [key, year],
        )
      ).length
    )
      return;
    let type = await manager.findOneBy(AnomalyType, { key });
    type ??= await manager.save(AnomalyType, { key });
    await manager.delete(Anomaly, { typeId: type.id });
    const candidates = await this.candidates(manager);
    if (!candidates || (await candidates.getCount()) < 5) return;
    const inserted = await manager.query(
      'INSERT INTO seasonal_anomaly_runs (key, year) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING key',
      [key, year],
    );
    if (!inserted.length) return;
    await this.clearOldGoods(manager, SEASONAL_TYPES[key].commodityId);
    for (let i = 0; i < 5; i++) {
      const locationId = await this.randomLocation(manager);
      if (locationId === null)
        throw new Error('Seasonal anomaly location pool changed');
      await manager.save(Anomaly, {
        typeId: type.id,
        locationId,
        remainingTicks: key === 'LIFE_DAY_GIFT' ? 576 : 168,
        data: { year, opensOn, expiresOn, lastMovedOn: today },
      });
    }
  }

  private async candidates(manager: EntityManager) {
    const layer = await manager.findOneBy(Layer, { isDefault: true });
    if (!layer) return null;
    return manager
      .getRepository(SpaceLocation)
      .createQueryBuilder('location')
      .innerJoin('location.galaxyField', 'field')
      .innerJoin('field.fieldType', 'fieldType')
      .where('field.layerId = :layerId', { layerId: layer.id })
      .andWhere('field.isPassable = true AND fieldType.passable = true')
      .andWhere(
        'field.damage = 0 AND fieldType.damage = 0 AND fieldType.specialDamage = 0',
      )
      .andWhere('field.starSystemId IS NULL AND fieldType.isSystem = false')
      .andWhere("COALESCE(field.effects, '') NOT LIKE :forbidden", {
        forbidden: `%"${FieldEffect.NO_ANOMALIES}"%`,
      })
      .andWhere("COALESCE(fieldType.effects, '') NOT LIKE :forbidden")
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM spacecraft ship WHERE ship."locationId" = location.id)',
      )
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM anomalies a WHERE a."locationId" = location.id)',
      );
  }
  private async randomLocation(manager: EntityManager): Promise<number | null> {
    const candidates = await this.candidates(manager);
    const count = candidates ? await candidates.getCount() : 0;
    if (!candidates || !count) return null;
    const selected = await candidates
      .orderBy('location.id', 'ASC')
      .skip(Math.floor(this.random() * count))
      .take(1)
      .getOne();
    return selected?.id ?? null;
  }

  private async clearOldGoods(
    manager: EntityManager,
    commodityId: number,
  ): Promise<void> {
    const cargo = await manager.find(CargoItem, {
      where: { commodityId },
      select: { spacecraftId: true },
    });
    const ids = [...new Set(cargo.map((item) => item.spacecraftId))].sort(
      (a, b) => a - b,
    );
    if (ids.length) {
      await manager
        .getRepository(Spacecraft)
        .createQueryBuilder('ship')
        .where('ship.id IN (:...ids)', { ids })
        .orderBy('ship.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();
      await manager.delete(CargoItem, { commodityId });
      await manager.query(
        'UPDATE spacecraft SET "cargoUsed" = (SELECT COALESCE(SUM(amount), 0) FROM cargo_items WHERE "spacecraftId" = spacecraft.id) WHERE id = ANY($1)',
        [ids],
      );
    }
    await manager.delete(ColonyStorage, { commodityId });
    await manager.query(
      'DELETE FROM trade_account_storage WHERE "commodityId" = $1',
      [commodityId],
    );
  }

  async handleTick(anomaly: Anomaly, manager: EntityManager): Promise<void> {
    if (!this.active(anomaly)) {
      anomaly.remainingTicks = 1;
      return;
    }
    // Wall-clock lifetime remains valid even when the main tick schedule changes.
    const data = this.data(anomaly)!;
    anomaly.remainingTicks = Math.max(
      2,
      Math.ceil(
        (Date.parse(`${data.expiresOn}T00:00:00Z`) - this.now().getTime()) /
          3600000,
      ) + 1,
    );
    const today = berlinDay(this.now());
    if (anomaly.type.key === 'SPRING_CAPSULE' || data.lastMovedOn !== today) {
      const locationId = await this.randomLocation(manager);
      if (locationId !== null) anomaly.locationId = locationId;
      anomaly.data = { ...data, lastMovedOn: today };
    }
  }

  async open(userId: number, shipId: number, anomalyId: number) {
    if (!this.enabled())
      throw new BadRequestException('Saisonale Anomalien sind deaktiviert');
    return this.db.transaction(async (manager) => {
      await this.lock(manager);
      const ship = await manager.findOne(Spacecraft, {
        where: { id: shipId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ship) throw new NotFoundException('Schiff nicht gefunden');
      const anomaly = await manager.findOne(Anomaly, {
        where: { id: anomalyId },
        relations: ['type'],
      });
      const key = anomaly?.type.key as SeasonalKey;
      if (
        !anomaly ||
        !(key in SEASONAL_TYPES) ||
        !this.active(anomaly) ||
        anomaly.remainingTicks <= 0
      )
        throw new NotFoundException('Saisonale Anomalie nicht gefunden');
      if (ship.locationId !== anomaly.locationId)
        throw new BadRequestException(
          'Die Anomalie liegt nicht auf deinem Feld',
        );
      const user = await manager.findOneBy(User, { id: userId });
      if (!user || user.isNpc)
        throw new BadRequestException(
          'Nur Spieler können Sammelwaren erhalten',
        );
      if (ship.crew < ship.crewRequired)
        throw new BadRequestException('Nicht genügend Crew');
      const today = berlinDay(this.now());
      if (
        key === 'LIFE_DAY_GIFT' &&
        (
          await manager.query(
            'SELECT 1 FROM seasonal_anomaly_openings WHERE "userId" = $1 AND day = $2 AND key = $3',
            [userId, today, key],
          )
        ).length
      )
        throw new BadRequestException(
          'Du hast heute bereits ein Geschenk geöffnet',
        );
      const used =
        (await manager
          .getRepository(CargoItem)
          .sum('amount', { spacecraftId: shipId })) ?? 0;
      if (used >= ship.cargoMax)
        throw new BadRequestException('Der Frachtraum ist voll');
      await manager.query(
        'INSERT INTO seasonal_anomaly_openings ("userId", key, day, "anomalyId") VALUES ($1, $2, $3, $4)',
        [userId, key, today, anomalyId],
      );
      const reward = SEASONAL_TYPES[key];
      await manager.query(
        'INSERT INTO cargo_items ("spacecraftId", "commodityId", amount) VALUES ($1, $2, 1) ON CONFLICT ("spacecraftId", "commodityId") DO UPDATE SET amount = cargo_items.amount + 1',
        [shipId, reward.commodityId],
      );
      await manager.update(Spacecraft, { id: shipId }, { cargoUsed: used + 1 });
      let prestigeAwarded =
        key === 'LIFE_DAY_GIFT' && today.endsWith('-12-06') ? 500 : 0;
      if (key === 'SPRING_CAPSULE') {
        await manager.delete(Anomaly, anomaly.id);
        if (
          !(await manager
            .getRepository(Anomaly)
            .exists({ where: { typeId: anomaly.typeId } }))
        )
          prestigeAwarded = 500;
      }
      if (prestigeAwarded)
        await this.prestige.change(
          userId,
          prestigeAwarded,
          key === 'LIFE_DAY_GIFT'
            ? '500 Prestige für das erste Lebenstag-Geschenk am 6. Dezember'
            : '500 Prestige für die letzte Frühlings-Kapsel',
          manager,
        );
      return {
        commodityId: reward.commodityId,
        amount: 1,
        prestigeAwarded,
        message: `1 ${reward.commodityName} erhalten${prestigeAwarded ? ` und ${prestigeAwarded} Prestige` : ''}.`,
      };
    });
  }
}
