import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SharedLivePositionDto } from '@swuniverse/shared';
import { Not, Repository } from 'typeorm';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { resolveSpacecraftLocation } from './spacecraft-field';

@Injectable()
export class LivePositionVisibilityService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    private readonly relationships: RelationshipResolverService,
  ) {}

  async listForViewer(viewerId: number): Promise<SharedLivePositionDto[]> {
    const ships = await this.shipRepo.find({
      where: { userId: Not(viewerId), status: Not(SpacecraftStatus.DESTROYED) },
      relations: [
        'user',
        'location',
        'location.galaxyField',
        'location.systemField',
      ],
      order: { id: 'ASC' },
    });

    const visibilityByOwner = new Map<number, Promise<boolean>>();
    const mayView = (ownerId: number) => {
      let permission = visibilityByOwner.get(ownerId);
      if (!permission) {
        permission = this.relationships
          .resolve(viewerId, ownerId)
          .then((relationship) => relationship.mayShareLivePosition)
          .catch(() => false);
        visibilityByOwner.set(ownerId, permission);
      }
      return permission;
    };

    const positions = await Promise.all(
      ships.map(async (ship): Promise<SharedLivePositionDto | null> => {
        if (ship.userId === viewerId || !(await mayView(ship.userId)))
          return null;
        const location = resolveSpacecraftLocation(ship);
        if (!location) return null;
        return {
          spacecraftId: ship.id,
          spacecraftName: ship.name,
          shipClassId: ship.shipClassId,
          ownerId: ship.userId,
          ownerName: ship.user?.username ?? null,
          location,
        };
      }),
    );

    return positions.filter(
      (position): position is SharedLivePositionDto => position !== null,
    );
  }
}
