import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type {
  ColonySandboxActionDto,
  ColonySandboxOptionsDto,
} from '@swuniverse/shared';
import { ColonySandboxService } from './colony-sandbox.service';
import { ColonyConstructionService } from './colony-construction.service';
import { BuildingDef, GameDataService } from '../game-data/game-data.service';
import { ColonyBuildingManagementService } from './colony-building-management.service';
import { BuildingMassActionMode } from './colony-building-management.types';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { ColonySandbox } from './entities/colony-sandbox.entity';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { colonySandboxContext } from './colony-sandbox-context';

/** Mutates only JSON planning inputs. Never calls the live construction/lifecycle actions. */
@Injectable()
export class ColonySandboxPlanningService {
  constructor(
    private readonly source: DataSource,
    private readonly sandboxes: ColonySandboxService,
    private readonly rules: ColonyConstructionService,
    private readonly gameData: GameDataService,
    private readonly management: ColonyBuildingManagementService,
    private readonly unlocks: UnlockResolverService,
  ) {}

  private async owned(
    manager: EntityManager,
    userId: number,
    id: number,
    lock = false,
  ) {
    const sandbox = await manager.getRepository(ColonySandbox).findOne({
      where: { id, userId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!sandbox) throw new NotFoundException('Sandbox nicht gefunden.');
    return sandbox;
  }

  private async field(colony: Colony, index: number, userId: number) {
    const field = colony.fields.find((entry) => entry.fieldIndex === index);
    if (!field) throw new NotFoundException('Feld nicht gefunden.');
    if (
      (field.layer === 'UNDERGROUND' ||
        (!field.layer && field.fieldType >= 800 && field.fieldType < 900)) &&
      !(await this.unlocks.hasTechByName(userId, 'Untergrund-Wissen'))
    ) {
      throw new BadRequestException('Untergrund-Wissen erforderlich.');
    }
    return field;
  }

  private async userColonies(
    manager: EntityManager,
    userId: number,
    sandbox: ColonySandbox,
    colony: Colony,
  ) {
    const colonies = await manager
      .getRepository(Colony)
      .find({ where: { userId, isAbandoned: false }, relations: ['fields'] });
    return [
      ...colonies.filter((entry) => entry.id !== sandbox.sourceColonyId),
      colony,
    ];
  }

  private deactivate(colony: Colony, field: ColonyField) {
    const definition = this.gameData.getBuilding(field.buildingId!);
    field.isActive = false;
    if (definition)
      for (const dependent of this.rules.getDependentFields(colony, definition))
        dependent.isActive = false;
  }

  private install(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
    activate: boolean,
  ) {
    if (field.buildingId) this.deactivate(colony, field);
    Object.assign(field, {
      buildingId: definition.id,
      isBuilding: false,
      buildProgress: 100,
      buildFinishesAt: null,
      integrity: definition.integrity || field.maxIntegrity || 0,
      maxIntegrity: definition.integrity || field.maxIntegrity || 0,
      isActive: false,
      activateAfterBuild: activate,
      reactivateAfterUpgrade: null,
    });
    if (activate) {
      this.rules.assertCanActivateBuilding(colony, field, definition);
      field.isActive = true;
    }
  }

  private switch(colony: Colony, field: ColonyField, activate: boolean) {
    if (!field.buildingId || field.isBuilding)
      throw new BadRequestException('No completed building on this field');
    if (this.rules.isHeadquartersField(field))
      throw new BadRequestException('Zentralgebäude geschützt');
    const definition = this.gameData.getBuilding(field.buildingId);
    if (!definition) throw new BadRequestException('Unknown building');
    if (field.isActive === activate) return;
    if (activate) {
      this.rules.assertCanActivateBuilding(colony, field, definition);
      field.isActive = true;
    } else this.deactivate(colony, field);
  }

  async act(userId: number, id: number, action: ColonySandboxActionDto) {
    const skipped: Array<{ fieldIndex: number; reason: string }> = [];
    await this.source.transaction(async (manager) => {
      const sandbox = await this.owned(manager, userId, id, true);
      const colony = colonySandboxContext(sandbox, this.gameData);
      if (action.action === 'mass-toggle') {
        if (
          !Number.isInteger(action.mode) ||
          action.mode < 1 ||
          action.mode > 7
        )
          throw new BadRequestException('Ungültiger Schaltmodus.');
        for (const candidate of this.management.selectFields(
          colony,
          action.mode as BuildingMassActionMode,
          action,
        )) {
          try {
            const field = await this.field(
              colony,
              candidate.fieldIndex,
              userId,
            );
            this.switch(colony, field, action.activate);
          } catch (cause) {
            if (!(cause instanceof BadRequestException)) throw cause;
            skipped.push({
              fieldIndex: candidate.fieldIndex,
              reason: cause.message,
            });
          }
        }
      } else {
        const field = await this.field(colony, action.fieldIndex, userId);
        switch (action.action) {
          case 'build': {
            const colonies = await this.userColonies(
              manager,
              userId,
              sandbox,
              colony,
            );
            const definition = await this.rules.validateBuildPlacement(
              colony,
              userId,
              field,
              action.buildingId,
              undefined,
              { userColonies: colonies },
            );
            this.install(colony, field, definition, action.activate ?? true);
            break;
          }
          case 'upgrade': {
            const colonies = await this.userColonies(
              manager,
              userId,
              sandbox,
              colony,
            );
            const { targetDefinition } = await this.rules.validateUpgrade(
              colony,
              userId,
              field,
              action.upgradeId,
              colonies,
            );
            this.install(colony, field, targetDefinition, field.isActive);
            break;
          }
          case 'demolish':
            this.rules.validateDemolition(field);
            this.deactivate(colony, field);
            Object.assign(field, {
              buildingId: null,
              isActive: false,
              integrity: 0,
              maxIntegrity: 0,
              isBuilding: false,
              buildProgress: 0,
              buildFinishesAt: null,
              activateAfterBuild: true,
              reactivateAfterUpgrade: null,
            });
            break;
          case 'toggle':
            this.switch(colony, field, !field.isActive);
            break;
          case 'terraform': {
            const terraforming = await this.rules.validateTerraforming(
              userId,
              field,
              action.terraformingId,
            );
            if (/^\d+$/.test(terraforming.toFieldType))
              field.fieldType = this.rules.normalizeFieldTypeCandidate(
                Number(terraforming.toFieldType),
              );
            field.terrainTileId = terraforming.toFieldType;
            field.terraformingId = null;
            field.terraformingFinishesAt = null;
            break;
          }
          default:
            throw new BadRequestException('Unbekannte Sandbox-Aktion.');
        }
      }
      sandbox.snapshot.fields = colony.fields.map((field) => ({
        ...field,
        buildFinishesAt: field.buildFinishesAt?.toISOString() ?? null,
        terraformingFinishesAt:
          field.terraformingFinishesAt?.toISOString() ?? null,
      }));
      await manager.getRepository(ColonySandbox).save(sandbox);
    });
    return { ...(await this.sandboxes.get(userId, id)), skipped };
  }

  async options(
    userId: number,
    id: number,
    fieldIndex: number,
  ): Promise<ColonySandboxOptionsDto> {
    return this.source.transaction(async (manager) => {
      const sandbox = await this.owned(manager, userId, id);
      const colony = colonySandboxContext(sandbox, this.gameData);
      const field = await this.field(colony, fieldIndex, userId);
      const colonies = await this.userColonies(
        manager,
        userId,
        sandbox,
        colony,
      );
      const result: ColonySandboxOptionsDto = {
        buildingIds: [],
        upgrades: [],
        terraformingIds: [],
      };
      const eligible = async (check: () => Promise<unknown>) => {
        try {
          await check();
          return true;
        } catch (cause) {
          if (cause instanceof BadRequestException) return false;
          throw cause;
        }
      };
      for (const building of this.gameData.getAllBuildings()) {
        if (building.visible === false) continue;
        if (
          await eligible(() =>
            this.rules.validateBuildPlacement(
              colony,
              userId,
              field,
              building.id,
              undefined,
              { userColonies: colonies },
            ),
          )
        )
          result.buildingIds.push(building.id);
      }
      if (field.buildingId)
        for (const upgrade of this.gameData.getBuildingUpgradesForBuilding(
          field.buildingId,
        )) {
          if (
            await eligible(() =>
              this.rules.validateUpgrade(
                colony,
                userId,
                field,
                upgrade.id,
                colonies,
              ),
            )
          )
            result.upgrades.push(upgrade);
        }
      for (const option of this.gameData.getAllTerraforming()) {
        if (
          await eligible(() =>
            this.rules.validateTerraforming(userId, field, option.id),
          )
        )
          result.terraformingIds.push(option.id);
      }
      return result;
    });
  }
}
