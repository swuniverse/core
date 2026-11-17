import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import type { DockingPrivilegesDto } from '@swuniverse/shared';
import { DataSource, EntityManager, In } from 'typeorm';
import { AllianceMembership } from '../alliance/entities/alliance-membership.entity';
import { Alliance } from '../alliance/entities/alliance.entity';
import {
  ALLIANCE_CONTEXT_CLEANUP,
  AllianceContextCleanup,
} from '../alliance/alliance-context-cleanup';
import { User } from '../auth/user.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import {
  decideDockingAccess,
  type DockingAccessDecision,
  type DockingActor,
} from './docking-access';
import {
  DockingPrivilege,
  DockingPrivilegeMode,
  DockingPrivilegeType,
} from './entities/docking-privilege.entity';
import { Spacecraft, SpacecraftKind } from './entities/spacecraft.entity';

type ShipRef = Pick<Spacecraft, 'id' | 'userId' | 'name'>;

/** Station access rules (Dockingrechte), their evaluation and owner notices. */
@Injectable()
export class DockingPrivilegeService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly messagingService: MessagingService,
    @Optional()
    @Inject(ALLIANCE_CONTEXT_CLEANUP)
    private readonly contextCleanup?: AllianceContextCleanup,
  ) {}

  onModuleInit(): void {
    // Rules aimed at an alliance must not outlive it or pass to a reused id.
    this.contextCleanup?.register({
      allianceDissolved: async ({ allianceId }, { transaction }) => {
        await (transaction as EntityManager).delete(DockingPrivilege, {
          targetType: DockingPrivilegeType.ALLIANCE,
          targetId: allianceId,
        });
      },
      reset: async ({ transaction }) => {
        await (transaction as EntityManager).delete(DockingPrivilege, {
          targetType: DockingPrivilegeType.ALLIANCE,
        });
      },
    });
  }

  async list(stationId: number, userId: number): Promise<DockingPrivilegesDto> {
    const station = await this.ownedStation(this.dataSource.manager, stationId, userId);
    const rules = await this.dataSource.manager.find(DockingPrivilege, {
      where: { stationId },
      order: { id: 'ASC' },
    });
    const names = await this.targetNames(this.dataSource.manager, rules);
    return {
      autoRead: station.dockPmAutoRead,
      privileges: rules
        .filter((rule) => names.has(key(rule.targetType, rule.targetId)))
        .map((rule) => ({
          id: rule.id,
          targetType: rule.targetType,
          targetId: rule.targetId,
          targetName: names.get(key(rule.targetType, rule.targetId)) as string,
          mode: rule.mode,
        })),
    };
  }

  /** Adds a rule; an existing rule for the same target switches mode instead. */
  async add(
    stationId: number,
    userId: number,
    targetType: DockingPrivilegeType,
    targetId: number,
    mode: DockingPrivilegeMode,
  ): Promise<DockingPrivilegesDto> {
    await this.dataSource.transaction(async (manager) => {
      await this.ownedStation(manager, stationId, userId);
      const exists = await this.targetNames(manager, [{ targetType, targetId }]);
      if (!exists.has(key(targetType, targetId))) {
        throw new BadRequestException('Das Ziel existiert nicht');
      }
      const current = await manager.findOneBy(DockingPrivilege, {
        stationId,
        targetType,
        targetId,
      });
      if (current) {
        current.mode = mode;
        await manager.save(current);
      } else {
        await manager.save(
          manager.create(DockingPrivilege, { stationId, targetType, targetId, mode }),
        );
      }
    });
    return this.list(stationId, userId);
  }

  async remove(
    stationId: number,
    userId: number,
    privilegeId: number,
  ): Promise<DockingPrivilegesDto> {
    await this.dataSource.transaction(async (manager) => {
      await this.ownedStation(manager, stationId, userId);
      await manager.delete(DockingPrivilege, { id: privilegeId, stationId });
    });
    return this.list(stationId, userId);
  }

  async setAutoRead(
    stationId: number,
    userId: number,
    enabled: boolean,
  ): Promise<DockingPrivilegesDto> {
    await this.dataSource.transaction(async (manager) => {
      const station = await this.ownedStation(manager, stationId, userId);
      station.dockPmAutoRead = enabled;
      await manager.save(station);
    });
    return this.list(stationId, userId);
  }

  /** Evaluates the access rules of `station` for `ship` inside the caller's transaction. */
  async decide(
    manager: EntityManager,
    station: Pick<Spacecraft, 'id' | 'userId'>,
    ship: Pick<Spacecraft, 'id' | 'userId'>,
  ): Promise<DockingAccessDecision> {
    if (station.userId === ship.userId) return { allowed: true };
    const rules = await manager.find(DockingPrivilege, {
      where: { stationId: station.id },
    });
    return decideDockingAccess(station.userId, await this.actor(manager, ship), rules);
  }

  /** Ids of the given foreign stations at which `ship` may dock (for nearby actions). */
  async allowedStationIds(
    ship: Pick<Spacecraft, 'id' | 'userId'>,
    stations: Array<Pick<Spacecraft, 'id' | 'userId'>>,
  ): Promise<Set<number>> {
    const foreign = stations.filter((station) => station.userId !== ship.userId);
    const allowed = new Set(
      stations.filter((s) => s.userId === ship.userId).map((s) => s.id),
    );
    if (foreign.length === 0) return allowed;
    const manager = this.dataSource.manager;
    const actor = await this.actor(manager, ship);
    const rules = await manager.find(DockingPrivilege, {
      where: { stationId: In(foreign.map((station) => station.id)) },
    });
    for (const station of foreign) {
      const own = rules.filter((rule) => rule.stationId === station.id);
      if (decideDockingAccess(station.userId, actor, own).allowed) allowed.add(station.id);
    }
    return allowed;
  }

  /** Tells the station owner that a foreign ship docked (optionally already read). */
  async notifyForeignDocking(
    station: Pick<Spacecraft, 'id' | 'userId' | 'name' | 'dockPmAutoRead'>,
    ships: ShipRef[],
  ): Promise<void> {
    const foreign = ships.filter((ship) => ship.userId !== station.userId);
    if (foreign.length === 0) return;
    const owners = await this.dataSource.manager.findBy(User, {
      id: In([...new Set(foreign.map((ship) => ship.userId))]),
    });
    const ownerName = (id: number) =>
      owners.find((owner) => owner.id === id)?.username ?? 'Unbekannt';
    for (const ship of foreign) {
      await this.messagingService.sendSystem(
        station.userId,
        `Fremdes Schiff angedockt: ${station.name}`,
        `Die ${ship.name} von ${ownerName(ship.userId)} hat an der Station ${station.name} angedockt.`,
        undefined,
        MessageFolder.STATION,
        undefined,
        station.dockPmAutoRead,
      );
    }
  }

  private async actor(
    manager: EntityManager,
    ship: Pick<Spacecraft, 'id' | 'userId'>,
  ): Promise<DockingActor> {
    const [user, membership] = await Promise.all([
      manager.findOneBy(User, { id: ship.userId }),
      manager.findOneBy(AllianceMembership, { userId: ship.userId }),
    ]);
    return {
      shipId: ship.id,
      userId: ship.userId,
      allianceId: membership?.allianceId ?? null,
      factionId: user?.factionId ?? null,
    };
  }

  private async ownedStation(
    manager: EntityManager,
    stationId: number,
    userId: number,
  ): Promise<Spacecraft> {
    const station = manager.queryRunner?.isTransactionActive
      ? await manager.findOne(Spacecraft, { where: { id: stationId, userId }, lock: { mode: 'pessimistic_write' } })
      : await manager.findOneBy(Spacecraft, { id: stationId, userId });
    if (!station || station.kind !== SpacecraftKind.STATION) {
      throw new NotFoundException('Station nicht gefunden');
    }
    return station;
  }

  /** Display names of rule targets; targets that no longer exist are absent. */
  private async targetNames(
    manager: EntityManager,
    rules: Array<{ targetType: DockingPrivilegeType; targetId: number }>,
  ): Promise<Map<string, string>> {
    const ids = (type: DockingPrivilegeType) => [
      ...new Set(rules.filter((r) => r.targetType === type).map((r) => r.targetId)),
    ];
    const names = new Map<string, string>();
    const [users, alliances, factions, ships] = await Promise.all([
      ids(DockingPrivilegeType.USER).length
        ? manager.findBy(User, { id: In(ids(DockingPrivilegeType.USER)) })
        : [],
      ids(DockingPrivilegeType.ALLIANCE).length
        ? manager.findBy(Alliance, { id: In(ids(DockingPrivilegeType.ALLIANCE)) })
        : [],
      ids(DockingPrivilegeType.FACTION).length
        ? manager.findBy(FactionEntity, { id: In(ids(DockingPrivilegeType.FACTION)) })
        : [],
      ids(DockingPrivilegeType.SHIP).length
        ? manager.findBy(Spacecraft, { id: In(ids(DockingPrivilegeType.SHIP)) })
        : [],
    ]);
    for (const u of users) names.set(key(DockingPrivilegeType.USER, u.id), u.username);
    for (const a of alliances) names.set(key(DockingPrivilegeType.ALLIANCE, a.id), a.name);
    for (const f of factions) names.set(key(DockingPrivilegeType.FACTION, f.id), f.name);
    for (const s of ships) names.set(key(DockingPrivilegeType.SHIP, s.id), s.name);
    return names;
  }
}

const key = (type: DockingPrivilegeType, id: number) => `${type}:${id}`;
