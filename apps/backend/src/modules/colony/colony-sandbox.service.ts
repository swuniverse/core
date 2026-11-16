import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type {
  ColonySandboxDto,
  ColonySandboxFieldDto,
  ColonySandboxListDto,
  ColonySandboxSummaryDto,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyStats } from './entities/colony-stats.entity';
import { ColonySandbox } from './entities/colony-sandbox.entity';

@Injectable()
export class ColonySandboxService {
  constructor(
    @InjectRepository(ColonySandbox)
    private readonly sandboxes: Repository<ColonySandbox>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly unlocks: UnlockResolverService,
    private readonly statsCalculator: ColonyStatsService,
  ) {}

  private limit(): number {
    const value = this.config.get('COLONY_SANDBOX_LIMIT');
    if (value == null || value === '') return 3;
    const configured = Number(value);
    return Number.isSafeInteger(configured) && configured >= 0 ? configured : 3;
  }

  private name(value: string): string {
    const name = typeof value === 'string' ? value.trim() : '';
    if (!name || name.length > 100)
      throw new BadRequestException(
        'Der Name muss zwischen 1 und 100 Zeichen lang sein.',
      );
    return name;
  }

  private summary(sandbox: ColonySandbox): ColonySandboxSummaryDto {
    return {
      id: sandbox.id,
      name: sandbox.name,
      sourceColonyId: sandbox.sourceColonyId,
      sourceColonyName: sandbox.snapshot.sourceColonyName,
      createdAt: sandbox.createdAt.toISOString(),
    };
  }

  async list(userId: number): Promise<ColonySandboxListDto> {
    const sandboxes = await this.sandboxes.find({
      where: { userId },
      order: { id: 'DESC' },
    });
    return {
      limit: this.limit(),
      sandboxes: sandboxes.map((sandbox) => this.summary(sandbox)),
    };
  }

  private async owned(userId: number, id: number): Promise<ColonySandbox> {
    const sandbox = await this.sandboxes.findOne({ where: { id, userId } });
    if (!sandbox) throw new NotFoundException('Sandbox nicht gefunden.');
    return sandbox;
  }

  private async detail(
    userId: number,
    sandbox: ColonySandbox,
  ): Promise<ColonySandboxDto> {
    const hasUndergroundKnowledge = await this.unlocks.hasTechByName(
      userId,
      'Untergrund-Wissen',
    );
    return {
      ...this.summary(sandbox),
      snapshot: {
        ...sandbox.snapshot,
        fields: sandbox.snapshot.fields.map((field) => {
          if (field.layer !== 'UNDERGROUND' || hasUndergroundKnowledge)
            return { ...field };
          return {
            id: field.id,
            fieldIndex: field.fieldIndex,
            layer: field.layer,
            fieldType: 0,
            terrainTileId: null,
            bonusMarker: null,
            buildingId: null,
            isBuilding: false,
            buildProgress: 0,
            buildFinishesAt: null,
            isActive: false,
            integrity: 0,
            maxIntegrity: 0,
            activateAfterBuild: false,
            reactivateAfterUpgrade: null,
            terraformingId: null,
            terraformingFinishesAt: null,
            locked: true,
          };
        }),
      },
    };
  }

  async get(userId: number, id: number): Promise<ColonySandboxDto> {
    return this.detail(userId, await this.owned(userId, id));
  }

  async create(
    userId: number,
    colonyId: number,
    value: string,
  ): Promise<ColonySandboxDto> {
    const name = this.name(value);
    const sandbox = await this.dataSource.transaction(async (manager) => {
      // All creations for one owner share this lock, even across colonies.
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Spieler nicht gefunden.');
      const colony = await manager.findOne(Colony, {
        where: { id: colonyId, userId, isAbandoned: false },
        lock: { mode: 'pessimistic_read' },
      });
      if (!colony) throw new NotFoundException('Kolonie nicht gefunden.');
      const context = await manager.findOne(Colony, {
        where: { id: colonyId }, relations: ['celestialObject', 'changeable'],
      }) ?? colony;
      const limit = this.limit();
      if (
        (await manager.count(ColonySandbox, { where: { userId } })) >= limit
      ) {
        throw new BadRequestException(
          `Maximal ${limit} Sandboxen je Spieler erlaubt.`,
        );
      }
      const fields = await manager.find(ColonyField, {
        where: { colonyId },
        order: { fieldIndex: 'ASC' },
      });
      const stats = await manager.findOne(ColonyStats, { where: { colonyId } });
      const snapshotFields: ColonySandboxFieldDto[] = fields.map((field) => ({
        id: field.id,
        fieldIndex: field.fieldIndex,
        fieldType: field.fieldType,
        terrainTileId: field.terrainTileId ?? null,
        layer: field.layer ?? null,
        bonusMarker: field.bonusMarker ?? null,
        buildingId: field.buildingId ?? null,
        isBuilding: field.isBuilding,
        buildProgress: field.buildProgress ?? 0,
        buildFinishesAt: field.buildFinishesAt?.toISOString() ?? null,
        isActive: field.isActive,
        integrity: field.integrity ?? 0,
        maxIntegrity: field.maxIntegrity ?? 0,
        activateAfterBuild: field.activateAfterBuild ?? true,
        reactivateAfterUpgrade: field.reactivateAfterUpgrade ?? null,
        terraformingId: field.terraformingId ?? null,
        terraformingFinishesAt:
          field.terraformingFinishesAt?.toISOString() ?? null,
      }));
      const populationMax = context.changeable?.maxPopulation ?? stats?.maxPopulation ?? colony.populationMax;
      const housingBonus = this.statsCalculator.calculateSummary({ ...context, fields }).housingBonus;
      return manager.save(
        ColonySandbox,
        manager.getRepository(ColonySandbox).create({
          userId,
          name,
          sourceColonyId: colony.id,
          snapshot: {
            sourceColonyName: colony.name,
            energy: context.changeable?.energy ?? colony.energy,
            celestialObject: context.celestialObject ? {
              classId: context.celestialObject.classId,
              name: context.celestialObject.name,
              objectType: context.celestialObject.objectType,
              swuRotation: context.celestialObject.swuRotation,
              swuRing: context.celestialObject.swuRing,
            } : null,
            colonyClassId: colony.colonyClassId,
            surfaceWidth: colony.surfaceWidth ?? null,
            surfaceMask: colony.surfaceMask ?? null,
            solarOutputTJ: colony.solarOutputTJ ?? null,
            rotationFactor: colony.rotationFactor ?? null,
            swuZoneSlot: colony.swuZoneSlot ?? null,
            population: context.changeable ? context.changeable.workers + context.changeable.workless : colony.population,
            populationMax,
            baseHousing: populationMax - housingBonus,
            energyMax: context.changeable?.maxEnergy ?? stats?.maxEnergy ?? colony.energyMax,
            storageMax: context.changeable?.maxStorage ?? stats?.maxStorage ?? colony.storageMax,
            workers: context.changeable?.workers ?? stats?.workers ?? 0,
            fields: snapshotFields,
          },
        }),
      );
    });
    return this.detail(userId, sandbox);
  }

  async rename(
    userId: number,
    id: number,
    value: string,
  ): Promise<ColonySandboxDto> {
    const name = this.name(value);
    await this.owned(userId, id);
    await this.sandboxes.update({ id, userId }, { name });
    return this.get(userId, id);
  }

  async remove(userId: number, id: number): Promise<void> {
    const result = await this.sandboxes.delete({ id, userId });
    if (!result.affected)
      throw new NotFoundException('Sandbox nicht gefunden.');
  }
}
