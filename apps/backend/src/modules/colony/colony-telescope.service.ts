import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ColonyTelescopeDto, ColonyTelescopeScanDto } from '@swuniverse/shared';
import { Repository } from 'typeorm';
import { ExplorationService } from '../starmap/exploration.service';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { StarmapQueryService } from '../starmap/starmap-query.service';
import { ColonyFunctionManagerService } from './colony-function-manager.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import { Colony } from './entities/colony.entity';
import { deductColonyEnergy, getColonyChangeable } from './colony-stats.service';

const TELESCOPE_FUNCTION_ID = 31;

export type ColonyTelescopeQuery = {
  centerX?: number;
  centerY?: number;
  targetX?: number;
  targetY?: number;
};

export function calculateTelescopeEnergyCost(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  layerWidth: number,
  layerHeight: number,
): number {
  const distance = Math.ceil(Math.hypot(targetX - originX, targetY - originY));
  const maximum = Math.ceil(Math.hypot(layerWidth - 1, layerHeight - 1));
  return Math.round(20 + (maximum > 0 ? (distance / maximum) * 180 : 0));
}

@Injectable()
export class ColonyTelescopeService {
  constructor(
    private readonly ownership: ColonyOwnershipService,
    private readonly functions: ColonyFunctionManagerService,
    @InjectRepository(Layer) private readonly layerRepo: Repository<Layer>,
    private readonly starmapQuery: StarmapQueryService,
    private readonly exploration: ExplorationService,
    @InjectRepository(Colony) private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(Spacecraft) private readonly shipRepo: Repository<Spacecraft>,
  ) {}

  async getView(
    colonyId: number,
    userId: number,
    query: ColonyTelescopeQuery,
  ): Promise<ColonyTelescopeDto> {
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    if (!this.functions.getPresentFunctionIds(colony).includes(TELESCOPE_FUNCTION_ID)) {
      throw new BadRequestException('Subspace telescope required');
    }
    if (!colony.starSystem) {
      throw new BadRequestException('Colony star system required');
    }
    const layer = await this.layerRepo.findOneBy({ id: colony.starSystem.layerId });
    if (!layer) throw new BadRequestException('Colony layer required');

    const origin = { x: colony.starSystem.cx, y: colony.starSystem.cy };
    const center = {
      x: this.clamp(query.centerX ?? origin.x, 1, layer.width),
      y: this.clamp(query.centerY ?? origin.y, 1, layer.height),
    };
    const sectorX = Math.floor((center.x - 1) / layer.sectorSize);
    const sectorY = Math.floor((center.y - 1) / layer.sectorSize);
    const explored = await this.starmapQuery.getExploredSectorFields(
      userId,
      layer.id,
      sectorX,
      sectorY,
      this.exploration,
    );
    const target =
      query.targetX != null && query.targetY != null
        ? {
            x: this.clamp(query.targetX, 1, layer.width),
            y: this.clamp(query.targetY, 1, layer.height),
          }
        : null;

    return {
      layer: { id: layer.id, width: layer.width, height: layer.height },
      origin,
      center,
      viewport: { width: layer.sectorSize, height: layer.sectorSize },
      fields: explored.fields,
      hiddenCount: explored.hiddenCount,
      energy: {
        available: getColonyChangeable(colony).energy,
        required: target
          ? calculateTelescopeEnergyCost(
              origin.x,
              origin.y,
              target.x,
              target.y,
              layer.width,
              layer.height,
            )
          : null,
      },
    };
  }

  async scan(
    colonyId: number,
    userId: number,
    target: { targetX: number; targetY: number },
  ): Promise<ColonyTelescopeScanDto> {
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    if (!this.functions.getPresentFunctionIds(colony).includes(TELESCOPE_FUNCTION_ID)) {
      throw new BadRequestException('Subspace telescope required');
    }
    if (!colony.starSystem) {
      throw new BadRequestException('Colony star system required');
    }
    const layer = await this.layerRepo.findOneBy({ id: colony.starSystem.layerId });
    if (!layer) throw new BadRequestException('Colony layer required');

    const x = this.clamp(target.targetX, 1, layer.width);
    const y = this.clamp(target.targetY, 1, layer.height);
    const cost = calculateTelescopeEnergyCost(
      colony.starSystem.cx,
      colony.starSystem.cy,
      x,
      y,
      layer.width,
      layer.height,
    );
    deductColonyEnergy(colony, cost);

    const ships = await this.shipRepo.find({
      where: {
        kind: SpacecraftKind.SHIP,
        status: SpacecraftStatus.IDLE,
        location: { galaxyField: { layerId: layer.id, cx: x, cy: y } },
      },
      relations: ['shipClass'],
    });
    const counts = new Map<string, number>();
    for (const ship of ships) {
      if (ship.kind !== 'SHIP' || ship.status === 'DESTROYED') continue;
      counts.set(ship.shipClass.category, (counts.get(ship.shipClass.category) ?? 0) + 1);
    }
    await this.colonyRepo.save(colony);

    return {
      target: { x, y },
      energy: { available: getColonyChangeable(colony).energy, spent: cost },
      categories: [...counts.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => a.category.localeCompare(b.category, 'de')),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, Math.round(value)));
  }
}
