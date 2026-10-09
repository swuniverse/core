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
import { mayActOnAlliance } from '../alliance/alliance-permissions';
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
  /** Viewer may see status, alert state, hull and crew of these ships. */
  managementDetails?: boolean;
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
  ) {}

  /** Starmap contacts of the viewer on one map layer. */
  async listContacts(
    viewerId: number,
    layerId: number,
  ): Promise<StarmapContactsDto> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const visibility = await this.visibilityByOwner(viewerId);
    const owned = {
      userId: In([...visibility.keys()]),
      status: Not(SpacecraftStatus.DESTROYED),
    };
    // Only ships on the requested layer: in open space, or inside a system
    // that lies on the layer.
    const ships = await this.shipRepo.find({
      where: [
        { ...owned, location: { galaxyField: { layerId } } },
        { ...owned, location: { systemField: { starSystem: { layerId } } } },
      ],
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
    const { viewerMembership, alliance, mateIds, viewerRole, partnerIds } =
      await this.relationships.starmapCandidates(viewerId);
    const managementDetails =
      viewerRole !== null &&
      mayActOnAlliance(viewerRole, 'viewShipManagementDetails');
    const candidateIds = [...new Set([...mateIds, ...partnerIds])].filter(
      (id) => !visibility.has(id),
    );
    if (candidateIds.length === 0) return visibility;

    // Resolve against the same membership snapshot the candidates came from.
    const stances = await this.relationships.resolveMany(
      viewerId,
      candidateIds,
      { viewerMembership },
    );
    for (const ownerId of candidateIds) {
      const stance = stances.get(ownerId);
      if (!stance) continue;
      if (alliance && stance.mayShareAllianceMap) {
        visibility.set(ownerId, {
          reason: 'ALLIANCE',
          stance: stance.status,
          alliance,
          managementDetails,
        });
      } else if (stance.mayShareLivePosition) {
        visibility.set(ownerId, {
          reason: 'SHARED_LIVE_POSITION',
          stance: stance.status,
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
    { reason, stance, alliance, managementDetails }: OwnerVisibility,
    layerId: number,
  ): StarmapContactDto | null {
    if (ship.status === SpacecraftStatus.DESTROYED) return null;
    const base = toBaseContact(ship);
    const galaxyCell = projectSpacecraftLocationToGalaxy(ship);
    if (!base || !galaxyCell || galaxyCell.layerId !== layerId) return null;
    const contact: StarmapContactDto = {
      ...base,
      galaxyCell: {
        layerId: galaxyCell.layerId,
        x: galaxyCell.x,
        y: galaxyCell.y,
      },
      reason,
      ...(stance ? { stance } : {}),
      ...(alliance ? { alliance: { ...alliance } } : {}),
    };
    if (reason === 'OWN' || (reason === 'ALLIANCE' && managementDetails)) {
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
      relations: SHIP_LOCATION_RELATIONS,
      order: { id: 'ASC' },
    });

    const stances = await this.relationships.resolveMany(
      viewerId,
      ships.map((ship) => ship.userId),
    );
    return ships.flatMap((ship) => {
      if (!stances.get(ship.userId)?.mayShareLivePosition) return [];
      const position = toBaseContact(ship);
      return position ? [position] : [];
    });
  }
}

/**
 * Identity, owner and resolved position of a ship: what every viewer who may
 * see the ship at all gets. Null when the position cannot be resolved.
 */
function toBaseContact(ship: Spacecraft): SharedLivePositionDto | null {
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
}
