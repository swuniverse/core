import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ColonyEnvironmentScanDto } from '@swuniverse/shared';
import { Not, Repository } from 'typeorm';
import { StarmapQueryService } from '../starmap/starmap-query.service';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { resolveSpacecraftLocation } from '../spacecraft/spacecraft-field';
import { resolveColonyLocation } from './colony-location';
import { ColonyOwnershipService } from './colony-ownership.service';

@Injectable()
export class ColonyEnvironmentScanService {
  constructor(
    private readonly ownership: ColonyOwnershipService,
    private readonly starmapQueryService: StarmapQueryService,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
  ) {}

  async getScan(
    colonyId: number,
    userId: number,
  ): Promise<ColonyEnvironmentScanDto> {
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    const location = resolveColonyLocation(colony);
    if (!location) {
      throw new BadRequestException('Colony has no system location');
    }

    const grid = await this.starmapQueryService.getSystemGrid(
      location.systemId,
    );
    const bounds = {
      minX: Math.max(1, location.x - 2),
      maxX: Math.min(grid.system.maxX, location.x + 2),
      minY: Math.max(1, location.y - 2),
      maxY: Math.min(grid.system.maxY, location.y + 2),
    };
    const inBounds = (x: number, y: number) =>
      x >= bounds.minX &&
      x <= bounds.maxX &&
      y >= bounds.minY &&
      y <= bounds.maxY;

    const ships = await this.shipRepo.find({
      where: {
        status: Not(SpacecraftStatus.DESTROYED),
        location: { systemField: { starSystemId: location.systemId } },
      },
      relations: ['location', 'location.systemField'],
    });
    const signatureCounts = new Map<
      string,
      ColonyEnvironmentScanDto['signatures'][number]
    >();
    for (const ship of ships) {
      if (ship.status === SpacecraftStatus.DESTROYED) continue;
      const shipLocation = resolveSpacecraftLocation(ship);
      if (
        shipLocation?.scope !== 'SYSTEM' ||
        shipLocation.systemId !== location.systemId ||
        !inBounds(shipLocation.x, shipLocation.y)
      ) {
        continue;
      }
      const key = `${shipLocation.x},${shipLocation.y}`;
      const signature = signatureCounts.get(key);
      if (signature) signature.visibleCount++;
      else {
        signatureCounts.set(key, {
          x: shipLocation.x,
          y: shipLocation.y,
          visibleCount: 1,
        });
      }
    }

    return {
      bounds,
      fields: grid.fields
        .filter((field) => inBounds(field.sx, field.sy))
        .map((field) => ({
          x: field.sx,
          y: field.sy,
          fieldTypeId: field.fieldTypeId,
          fieldTypeName: field.fieldType.name,
          celestialObject: field.celestialObject
            ? {
                id: field.celestialObject.id,
                name: field.celestialObject.name,
                objectType: field.celestialObject.objectType,
                classId: field.celestialObject.classId,
              }
            : null,
        })),
      signatures: [...signatureCounts.values()],
      fadedSignatures: { uncloaked: 0, cloaked: 0 },
      colonyShields: (grid.colonyShields ?? [])
        .filter((shield) => inBounds(shield.posX, shield.posY))
        .map((shield) => ({
          colonyId: shield.colonyId,
          x: shield.posX,
          y: shield.posY,
          shielded: shield.shielded,
        })),
      anomalies: [],
    };
  }
}
