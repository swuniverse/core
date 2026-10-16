import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import { ColonyScan } from './entities/colony-scan.entity';

export type ColonyScanProjection = {
  id: number;
  colonyId: number;
  scanner: { id: number; username: string | null };
  provenance: 'OWN' | 'ALLIANCE';
  canDelete: boolean;
  snapshot: {
    colonyName: string | null;
    owner: { id: number | null; username: string | null };
    scannedAt: Date;
    system: { id: number | null; celestialObjectId: number | null };
    colonyClassId: number | null;
    surface: {
      width: number | null;
      height: number | null;
      deposits: NonNullable<ColonyScan['deposits']>;
      fields: ColonyScan['surfaceFields'];
    };
  };
  systemId: number | null;
  current: {
    colony: {
      id: number;
      name: string;
      owner: { id: number; username: string | null } | null;
      isAbandoned: boolean;
      posX: number;
      posY: number;
      celestialObjectId: number | null;
    } | null;
  };
};

/**
 * Viewer-authorized historical colony scans. This is deliberately separate
 * from the profile/archive APIs: it selects exactly one newest scan per colony
 * from the viewer and their current alliance mates, at request time.
 */
@Injectable()
export class ColonyScanProjectionService {
  constructor(
    @InjectRepository(ColonyScan)
    private readonly scanRepo: Repository<ColonyScan>,
    private readonly relationshipResolver: RelationshipResolverService,
  ) {}

  async newestAccessibleForSystem(
    viewerId: number,
    systemId: number,
  ): Promise<ColonyScanProjection[]> {
    return this.newestAccessible(viewerId, { starSystemId: systemId });
  }

  async newestAccessibleForColonies(
    viewerId: number,
    colonyOwnerId: number,
  ): Promise<ColonyScanProjection[]> {
    return this.newestAccessible(viewerId, { colonyOwnerId });
  }

  async allAccessible(viewerId: number): Promise<ColonyScanProjection[]> {
    const scans = await this.accessibleScans(viewerId);
    return scans.map((scan) => this.toProjection(scan, viewerId));
  }

  private async newestAccessible(
    viewerId: number,
    scope: Partial<Pick<ColonyScan, 'starSystemId' | 'colonyOwnerId'>>,
  ): Promise<ColonyScanProjection[]> {
    const scans = await this.accessibleScans(viewerId, scope);
    const newestByColony = new Map<number, ColonyScan>();
    for (const scan of scans) {
      if (!newestByColony.has(scan.colonyId)) {
        newestByColony.set(scan.colonyId, scan);
      }
    }

    return [...newestByColony.values()].map((scan) =>
      this.toProjection(scan, viewerId),
    );
  }

  private async accessibleScans(
    viewerId: number,
    scope: Partial<Pick<ColonyScan, 'starSystemId' | 'colonyOwnerId'>> = {},
  ): Promise<ColonyScan[]> {
    const sharerIds = await this.relationshipResolver.historicalScanSharerIds(
      viewerId,
    );
    return this.scanRepo.find({
      where: { userId: In(sharerIds), ...scope },
      relations: ['user', 'colony', 'colony.user'],
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  toProjection(scan: ColonyScan, viewerId: number): ColonyScanProjection {
    const colony = scan.colony;
    return {
      id: scan.id,
      colonyId: scan.colonyId,
      systemId: scan.starSystemId,
      scanner: {
        id: scan.userId,
        username: scan.user?.username ?? null,
      },
      provenance: scan.userId === viewerId ? 'OWN' : 'ALLIANCE',
      canDelete: scan.userId === viewerId,
      snapshot: {
        colonyName: scan.colonyName,
        owner: {
          id: scan.colonyOwnerId,
          username: scan.colonyOwnerUsername,
        },
        scannedAt: scan.createdAt,
        system: {
          id: scan.starSystemId,
          celestialObjectId: scan.celestialObjectId,
        },
        colonyClassId: scan.colonyClassId,
        surface: {
          width: scan.surfaceWidth,
          height: scan.surfaceHeight,
          deposits: scan.deposits ?? [],
          fields: scan.surfaceFields,
        },
      },
      current: {
        colony: colony
          ? {
              id: colony.id,
              name: colony.name,
              owner: colony.user
                ? { id: colony.user.id, username: colony.user.username }
                : null,
              isAbandoned: colony.isAbandoned,
              posX: colony.posX,
              posY: colony.posY,
              celestialObjectId: colony.celestialObjectId,
            }
          : null,
      },
    };
  }
}
