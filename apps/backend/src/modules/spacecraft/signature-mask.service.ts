import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type {
  SignatureMaskChoiceDto,
  SignatureMaskDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, MoreThan } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { ShipClassDiscovery } from './entities/ship-class-discovery.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';

export const SIGNATURE_MASK_DURATION_MS = 5 * 60 * 1000;
export const SIGNATURE_MASK_CLOCK = 'SIGNATURE_MASK_CLOCK';
interface MaskRow {
  shipClassId: number;
  expiresAt: Date;
}

@Injectable()
export class SignatureMaskService {
  constructor(
    private readonly db: DataSource,
    private readonly gameData: GameDataService,
    @Optional()
    @Inject(SIGNATURE_MASK_CLOCK)
    private readonly now: () => number = Date.now,
  ) {}

  async get(shipId: number, userId: number): Promise<SignatureMaskDto> {
    return this.db.transaction(async (manager) =>
      this.view(manager, await this.lockOwned(manager, shipId, userId)),
    );
  }
  async activate(
    shipId: number,
    userId: number,
    targetId: number,
  ): Promise<SignatureMaskDto> {
    return this.db.transaction(async (manager) => {
      const ship = await this.lockOwned(manager, shipId, userId);
      const reason = await this.blockReason(manager, ship);
      if (reason) throw new BadRequestException(reason);
      const choice = (await this.choices(manager, ship)).find(
        (item) => item.shipClassId === targetId,
      );
      if (!choice)
        throw new BadRequestException(
          'Dieser Rumpf ist nicht für die Signaturmaskierung bekannt oder geeignet',
        );
      if (ship.energy < choice.epsCost)
        throw new BadRequestException(
          `Es werden ${choice.epsCost} EPS benötigt`,
        );
      const activatedAt = new Date(this.now());
      await manager.update(Spacecraft, ship.id, {
        energy: ship.energy - choice.epsCost,
      });
      ship.energy -= choice.epsCost;
      await manager.query(
        `INSERT INTO spacecraft_signature_masks ("spacecraftId", "shipClassId", "activatedAt", "expiresAt")
        VALUES ($1, $2, $3, $4) ON CONFLICT ("spacecraftId") DO UPDATE
        SET "shipClassId" = EXCLUDED."shipClassId", "activatedAt" = EXCLUDED."activatedAt", "expiresAt" = EXCLUDED."expiresAt"`,
        [
          ship.id,
          choice.shipClassId,
          activatedAt,
          new Date(activatedAt.getTime() + SIGNATURE_MASK_DURATION_MS),
        ],
      );
      return this.view(manager, ship);
    });
  }
  async deactivate(shipId: number, userId: number): Promise<SignatureMaskDto> {
    return this.db.transaction(async (manager) => {
      const ship = await this.lockOwned(manager, shipId, userId);
      await this.clear(manager, ship.id);
      return this.view(manager, ship);
    });
  }

  /** The emission and activation share the ship lock, including special movement transactions. */
  async withSnapshot<T>(
    ship: Spacecraft,
    manager: EntityManager | undefined,
    emit: (manager: EntityManager, hull: ShipClassDef | null) => Promise<T>,
  ): Promise<T> {
    const apply = async (transaction: EntityManager) => {
      const stored = await transaction.findOne(Spacecraft, {
        where: { id: ship.id },
        lock: { mode: 'pessimistic_write' },
      });
      // A caller may have changed drive state inside its still-open transaction.
      const masked =
        stored && this.runtimeHealthy(ship)
          ? await this.mask(transaction, stored)
          : null;
      if (!this.runtimeHealthy(ship)) await this.clear(transaction, ship.id);
      const hull = masked
        ? await transaction.findOneBy(ShipClassDef, { id: masked.shipClassId })
        : null;
      return emit(transaction, hull);
    };
    return manager ? apply(manager) : this.db.transaction(apply);
  }

  private async lockOwned(
    manager: EntityManager,
    shipId: number,
    userId: number,
  ) {
    const ship = await manager.findOne(Spacecraft, {
      where: { id: shipId, userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ship) throw new NotFoundException('Schiff nicht gefunden');
    return ship;
  }
  private runtimeHealthy(ship: Spacecraft) {
    const drive = ship.runtimeSystems?.WARPDRIVE as
      | { active?: boolean; integrity?: number }
      | undefined;
    return (
      ship.status !== SpacecraftStatus.DESTROYED &&
      drive?.active === true &&
      (drive.integrity ?? 100) > 0
    );
  }
  private async driveHealthy(manager: EntityManager, ship: Spacecraft) {
    return (
      this.runtimeHealthy(ship) &&
      manager.getRepository(SpacecraftModule).existsBy({
        spacecraftId: ship.id,
        category: 'HYPERDRIVE',
        isActive: true,
        integrity: MoreThan(0),
      })
    );
  }
  private async blockReason(
    manager: EntityManager,
    ship: Spacecraft,
  ): Promise<string | null> {
    if (
      ship.kind === 'STATION' ||
      ship.status === SpacecraftStatus.DESTROYED ||
      ship.status === SpacecraftStatus.IN_COMBAT ||
      ship.operatingMode === 'STANDBY'
    )
      return 'Dieses Schiff kann seine Signatur derzeit nicht maskieren';
    const location =
      ship.locationId == null
        ? null
        : await manager.findOneBy(SpaceLocation, { id: ship.locationId });
    if (location?.kind !== 'GALAXY_FIELD')
      return 'Signaturmaskierung ist nur im Galaxieraum möglich';
    if (!(await this.driveHealthy(manager, ship)))
      return 'Ein aktiver intakter Hyperantrieb ist erforderlich';
    return null;
  }
  private async choices(
    manager: EntityManager,
    ship: Spacecraft,
  ): Promise<SignatureMaskChoiceDto[]> {
    const hulls = await manager
      .getRepository(ShipClassDef)
      .createQueryBuilder('hull')
      .innerJoin(
        ShipClassDiscovery,
        'discovery',
        'discovery."shipClassId" = hull.id AND discovery."userId" = :owner',
        { owner: ship.userId },
      )
      .where('hull.id <> :own AND hull.category <> :station', {
        own: ship.shipClassId,
        station: 'STATION',
      })
      .orderBy('hull.name', 'ASC')
      .addOrderBy('hull.id', 'ASC')
      .getMany();
    return hulls.flatMap((hull) => {
      const definition = this.gameData.getShipClassDefByKey(hull.key);
      if (definition?.stuRumpId == null) return [];
      const level = this.gameData.getShipyardRumpModuleRules(
        definition.stuRumpId,
      )?.moduleRules.HYPERDRIVE?.level;
      return level && Number.isInteger(level) && level > 0
        ? [
            {
              shipClassId: hull.id,
              name: hull.name,
              driveLevel: level,
              epsCost: 25 * level,
            },
          ]
        : [];
    });
  }
  private clear(manager: EntityManager, id: number) {
    return manager.query(
      'DELETE FROM spacecraft_signature_masks WHERE "spacecraftId" = $1',
      [id],
    );
  }
  private async mask(
    manager: EntityManager,
    ship: Spacecraft,
  ): Promise<MaskRow | null> {
    const rows: MaskRow[] = await manager.query(
      'SELECT "shipClassId", "expiresAt" FROM spacecraft_signature_masks WHERE "spacecraftId" = $1',
      [ship.id],
    );
    const mask = rows[0];
    if (!mask) return null;
    if (
      mask.expiresAt.getTime() <= this.now() ||
      !(await this.driveHealthy(manager, ship))
    ) {
      await this.clear(manager, ship.id);
      return null;
    }
    return mask;
  }
  private async view(
    manager: EntityManager,
    ship: Spacecraft,
  ): Promise<SignatureMaskDto> {
    const mask = await this.mask(manager, ship);
    const hull = mask
      ? await manager.findOneBy(ShipClassDef, { id: mask.shipClassId })
      : null;
    return {
      energy: ship.energy,
      blockReason: await this.blockReason(manager, ship),
      choices: await this.choices(manager, ship),
      active:
        mask && hull
          ? {
              shipClassId: hull.id,
              name: hull.name,
              expiresAt: mask.expiresAt.toISOString(),
            }
          : null,
    };
  }
}
