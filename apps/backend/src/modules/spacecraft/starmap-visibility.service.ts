import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  SharedLivePositionDto,
  StarmapContactAllianceDto,
  StarmapContactDto,
  StarmapContactReason,
  StarmapContactStance,
  StarmapContactsDto,
} from '@swuniverse/shared';
import { In, Not, Repository } from 'typeorm';
import { AllianceInfrastructureCapabilityService } from '../alliance/alliance-infrastructure-capability.service';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import { Layer } from '../starmap/entities/layer.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import {
  projectSpacecraftLocationToGalaxy,
  resolveSpacecraftLocation,
} from './spacecraft-field';

/** Why and how the viewer sees the ships of one owner. */
interface OwnerVisibility {
  reason: StarmapContactReason;
  /** Central stance; absent for the viewer's own ships. */
  stance?: StarmapContactStance;
  alliance?: StarmapContactAllianceDto;
}

const SHIP_LOCATION_RELATIONS = [
  'user',
  'location',
  'location.galaxyField',
  'location.systemField',
  'location.systemField.starSystem',
];

/**
 * The single place that decides which ships a viewer sees on the starmap,
 * why, and with which level of detail. Visibility is derived on every request
 * from current ownership, membership and relationships; nothing is cached.
 */
@Injectable()
export class StarmapVisibilityService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    private readonly relationships: RelationshipResolverService,
    @InjectRepository(Layer)
    private readonly layerRepo: Repository<Layer>,
    private readonly capability: AllianceInfrastructureCapabilityService,
  ) {}

  /** Starmap contacts of the viewer on one map layer. */
  async listContacts(
    viewerId: number,
    layerId: number,
  ): Promise<StarmapContactsDto> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const visibility = await this.visibilityByOwner(viewerId);
    const ships = await this.shipRepo.find({
      where: {
        userId: In([...visibility.keys()]),
        status: Not(SpacecraftStatus.DESTROYED),
      },
      relations: SHIP_LOCATION_RELATIONS,
      order: { id: 'ASC' },
    });

    const contacts = ships.flatMap((ship) => {
      const owner = visibility.get(ship.userId);
      const contact = owner ? this.toContact(ship, owner, layerId) : null;
      return contact ? [contact] : [];
    });

    return {
      layerId,
      allianceContactsActive: this.capability.enabled,
      contacts,
    };
  }

  /**
   * Visibility per ship owner. Each owner gets exactly one reason, highest
   * priority first (OWN before ALLIANCE before SHARED_LIVE_POSITION); the
   * stances of all candidates are resolved in one batched `resolveMany`.
   * Membership and relationships are read fresh on every request.
   */
  private async visibilityByOwner(
    viewerId: number,
  ): Promise<Map<number, OwnerVisibility>> {
    const visibility = new Map<number, OwnerVisibility>([
      [viewerId, { reason: 'OWN' }],
    ]);
    if (!this.capability.enabled) return visibility;

    const { alliance, mateIds } =
      await this.relationships.allianceMapCandidates(viewerId);
    const candidateIds = mateIds.filter((id) => !visibility.has(id));
    if (candidateIds.length === 0) return visibility;

    const stances = await this.relationships.resolveMany(
      viewerId,
      candidateIds,
    );
    for (const ownerId of candidateIds) {
      const stance = stances.get(ownerId);
      if (alliance && stance?.mayShareAllianceMap) {
        visibility.set(ownerId, {
          reason: 'ALLIANCE',
          stance: stance.status,
          alliance,
        });
      }
    }
    return visibility;
  }

  /**
   * Base contact on the requested layer, or null when the ship is destroyed,
   * has no resolvable position or lies on another layer.
   */
  private toContact(
    ship: Spacecraft,
    { reason, stance, alliance }: OwnerVisibility,
    layerId: number,
  ): StarmapContactDto | null {
    if (ship.status === SpacecraftStatus.DESTROYED) return null;
    const location = resolveSpacecraftLocation(ship);
    const galaxyCell = projectSpacecraftLocationToGalaxy(ship);
    if (!location || !galaxyCell || galaxyCell.layerId !== layerId) return null;
    const contact: StarmapContactDto = {
      spacecraftId: ship.id,
      spacecraftName: ship.name,
      shipClassId: ship.shipClassId,
      ownerId: ship.userId,
      ownerName: ship.user?.username ?? null,
      location,
      galaxyCell: {
        layerId: galaxyCell.layerId,
        x: galaxyCell.x,
        y: galaxyCell.y,
      },
      reason,
      ...(stance ? { stance } : {}),
      ...(alliance ? { alliance: { ...alliance } } : {}),
    };
    if (reason === 'OWN') {
      contact.management = {
        status: ship.status,
        alertState: ship.alertState,
        hull: ship.hull,
        hullMax: ship.hullMax,
        crew: ship.crew,
        crewMax: ship.crewMax,
      };
    }
    return contact;
  }

  /**
   * Backward-compatible contract of `GET /spacecraft/shared-live-positions`:
   * only ships of other parties that share live positions with the viewer.
   */
  async listSharedLivePositions(
    viewerId: number,
  ): Promise<SharedLivePositionDto[]> {
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

    const stances = await this.relationships.resolveMany(
      viewerId,
      ships.map((ship) => ship.userId),
    );
    const positions = ships.map((ship): SharedLivePositionDto | null => {
      if (!stances.get(ship.userId)?.mayShareLivePosition) return null;
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
    });

    return positions.filter(
      (position): position is SharedLivePositionDto => position !== null,
    );
  }
}
