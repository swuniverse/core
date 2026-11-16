import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  AllianceRole,
  type AllianceDepotDto,
  type StationAllianceDepotDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import {
  ALLIANCE_CONTEXT_CLEANUP,
  AllianceContextCleanup,
} from './alliance-context-cleanup';
import { AllianceDepot } from './entities/alliance-depot.entity';
import { AllianceMembership } from './entities/alliance-membership.entity';
import { Alliance } from './entities/alliance.entity';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
  StationRole,
} from '../spacecraft/entities/spacecraft.entity';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { GameDataService } from '../game-data/game-data.service';

@Injectable()
export class AllianceDepotService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ALLIANCE_CONTEXT_CLEANUP)
    private readonly cleanup: AllianceContextCleanup,
    private readonly gameData: GameDataService,
  ) {}

  onModuleInit(): void {
    this.cleanup.register({
      memberRemoved: async ({ allianceId, userId }, { transaction }) => {
        await (transaction as EntityManager).delete(AllianceDepot, {
          allianceId,
          ownerUserId: userId,
        });
      },
      allianceDissolved: async ({ allianceId }, { transaction }) => {
        await (transaction as EntityManager).delete(AllianceDepot, {
          allianceId,
        });
      },
      reset: async ({ transaction }) => {
        await (transaction as EntityManager)
          .createQueryBuilder()
          .delete()
          .from(AllianceDepot)
          .execute();
      },
    });
  }

  async get(
    stationId: number,
    userId: number,
  ): Promise<StationAllianceDepotDto> {
    const manager = this.dataSource.manager;
    const station = await this.ownedStation(manager, stationId, userId);
    const membership = await manager.findOneBy(AllianceMembership, { userId });
    const ownAlliance = membership
      ? await manager.findOneBy(Alliance, { id: membership.allianceId })
      : null;
    const depot = await manager.findOne(AllianceDepot, {
      where: { stationId },
      relations: ['alliance'],
    });
    const valid =
      depot &&
      depot.ownerUserId === userId &&
      depot.allianceId === ownAlliance?.id;
    return {
      alliance: valid
        ? { id: depot.alliance.id, name: depot.alliance.name }
        : null,
      ownAlliance: ownAlliance
        ? { id: ownAlliance.id, name: ownAlliance.name }
        : null,
      blockReason:
        this.suitabilityReason(station) ??
        (!ownAlliance ? 'Du bist in keiner Allianz' : null),
    };
  }

  async assign(stationId: number, userId: number): Promise<void> {
    await this.dataSource
      .transaction(async (manager) => {
        const membership = await manager.findOneBy(AllianceMembership, {
          userId,
        });
        if (!membership)
          throw new BadRequestException('Du bist in keiner Allianz');
        // Alliance lifecycle mutations lock this row first. The shared lock keeps
        // assignment and member removal atomic without blocking independent owners.
        const alliance = await manager.findOne(Alliance, {
          where: { id: membership.allianceId },
          lock: { mode: 'pessimistic_read' },
        });
        const current = await manager.findOneBy(AllianceMembership, {
          userId,
          allianceId: membership.allianceId,
        });
        if (!alliance || !current)
          throw new BadRequestException('Du bist in keiner Allianz');
        const station = await this.ownedStation(
          manager,
          stationId,
          userId,
          true,
        );
        const reason = this.suitabilityReason(station);
        if (reason) throw new BadRequestException(reason);
        await manager.save(
          manager.create(AllianceDepot, {
            stationId,
            allianceId: alliance.id,
            ownerUserId: userId,
          }),
        );
      })
      .catch((error: unknown) => {
        if (
          error instanceof QueryFailedError &&
          error.driverError.code === '55P03'
        )
          throw new BadRequestException(
            'Station wird gerade geändert; bitte erneut versuchen',
          );
        throw error;
      });
  }

  async unassign(stationId: number, userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const station = await this.ownedStation(manager, stationId, userId, true);
      if (
        ![StationRole.DEPOT_SMALL, StationRole.DEPOT_LARGE].includes(
          station.stationRole!,
        )
      )
        throw new BadRequestException('Station ist keine Depotstation');
      await manager.delete(AllianceDepot, { stationId });
    });
  }

  async list(allianceId: number, userId: number): Promise<AllianceDepotDto[]> {
    return this.dataSource.transaction(async (manager) => {
      const alliance = await manager.findOne(Alliance, {
        where: { id: allianceId },
        lock: { mode: 'pessimistic_read' },
      });
      const member = await manager.findOneBy(AllianceMembership, {
        allianceId,
        userId,
      });
      if (
        !alliance ||
        !member ||
        ![AllianceRole.PRESIDENT, AllianceRole.VICE].includes(member.role)
      )
        throw new ForbiddenException(
          'Nur Präsident und Vize dürfen Allianzdepots einsehen',
        );
      const depots = await manager.find(AllianceDepot, {
        where: { allianceId },
        order: { stationId: 'ASC' },
        relations: [
          'station',
          'station.user',
          'station.location',
          'station.location.systemField',
          'station.location.systemField.starSystem',
          'station.location.galaxyField',
        ],
      });
      const result: AllianceDepotDto[] = [];
      for (const depot of depots) {
        const station = depot.station;
        if (
          station.userId !== depot.ownerUserId ||
          !(await manager.existsBy(AllianceMembership, {
            allianceId,
            userId: depot.ownerUserId,
          }))
        )
          continue;
        const cargo = await manager.find(CargoItem, {
          where: { spacecraftId: station.id },
          order: { commodityId: 'ASC' },
        });
        const field = station.location.systemField;
        const galaxy = station.location.galaxyField;
        result.push({
          stationId: station.id,
          name: station.name,
          owner: {
            id: station.userId,
            name: station.user.displayName || station.user.username,
          },
          locationLabel: field
            ? `${field.starSystem.name} (${field.sx}|${field.sy}) · Ebene ${field.starSystem.layerId}`
            : galaxy
              ? `${galaxy.cx}|${galaxy.cy} · Ebene ${galaxy.layerId}`
              : 'Unbekannter Standort',
          cargoUsed: cargo.reduce(
            (sum, row) => sum + Math.max(0, row.amount),
            0,
          ),
          cargoMax: station.cargoMax,
          cargo: cargo
            .filter((row) => row.amount > 0)
            .map((row) => ({
              commodityId: row.commodityId,
              amount: row.amount,
              name:
                this.gameData.getCommodity(row.commodityId)?.name ??
                `Ware ${row.commodityId}`,
            })),
        });
      }
      return result;
    });
  }

  private suitabilityReason(station: Spacecraft): string | null {
    if (
      ![StationRole.DEPOT_SMALL, StationRole.DEPOT_LARGE].includes(
        station.stationRole!,
      )
    )
      return 'Station ist keine Depotstation';
    if (station.status !== SpacecraftStatus.IDLE)
      return 'Depotstation ist nicht betriebsbereit';
    return null;
  }

  private async ownedStation(
    manager: EntityManager,
    id: number,
    userId: number,
    lock = false,
  ): Promise<Spacecraft> {
    const station = await manager.findOne(Spacecraft, {
      where: { id, userId, kind: SpacecraftKind.STATION },
      ...(lock
        ? {
            lock: {
              mode: 'pessimistic_write' as const,
              onLocked: 'nowait' as const,
            },
          }
        : {}),
    });
    if (!station) throw new NotFoundException('Station nicht gefunden');
    return station;
  }
}
