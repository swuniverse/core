import { EntityManager, In, IsNull, Not } from 'typeorm';
import { AllianceMembership } from '../alliance/entities/alliance-membership.entity';
import { User } from '../auth/user.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { TradePost } from '../trade/entities/trade-post.entity';
import { decideDockingAccess } from './docking-access';
import { DockingPrivilege } from './entities/docking-privilege.entity';
import { DockingPrivilegeType } from './docking-privilege.types';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { projectSpacecraftLocationToGalaxy } from './spacecraft-field';

export const CREW_LOCATION_RELATIONS = [
  'galaxyField',
  'systemField',
  'systemField.starSystem',
];

/** STU: same layer, Manhattan distance, and access for each rescued crew owner. */
export async function closestCrewTradePost(
  manager: EntityManager,
  locationId: number,
  userId: number,
) {
  const origin = await manager.findOne(SpaceLocation, {
    where: { id: locationId },
    relations: CREW_LOCATION_RELATIONS,
  });
  const position =
    origin && projectSpacecraftLocationToGalaxy({ location: origin });
  if (!position) return null;
  const owner = await manager.findOne(User, { where: { id: userId } });
  if (!owner) return null;
  const membership = await manager.findOne(AllianceMembership, {
    where: { userId },
  });
  const posts = await manager.find(TradePost, {
    where: { ownerId: Not(IsNull()) },
    order: { id: 'ASC' },
  });
  if (!posts.length) return null;
  const locations = await manager.find(SpaceLocation, {
    where: { id: In(posts.map((post) => post.locationId)) },
    relations: CREW_LOCATION_RELATIONS,
  });
  const candidates = posts
    .flatMap((post) => {
      const location = locations.find((entry) => entry.id === post.locationId);
      const point = location && projectSpacecraftLocationToGalaxy({ location });
      return point && point.layerId === position.layerId
        ? [
            {
              post,
              location,
              point,
              distance:
                Math.abs(point.x - position.x) + Math.abs(point.y - position.y),
            },
          ]
        : [];
    })
    .sort((a, b) => a.distance - b.distance || a.post.id - b.post.id);
  for (const candidate of candidates) {
    if (candidate.post.stationId != null) {
      const station = await manager.findOne(Spacecraft, {
        where: { id: candidate.post.stationId, status: SpacecraftStatus.IDLE },
      });
      if (!station) continue;
      const rules = await manager.find(DockingPrivilege, {
        where: { stationId: station.id },
      });
      if (
        !decideDockingAccess(
          station.userId,
          {
            shipId: 0,
            userId,
            allianceId: membership?.allianceId ?? null,
            factionId: owner.factionId ?? null,
          },
          rules.filter((rule) => rule.targetType !== DockingPrivilegeType.SHIP),
        ).allowed
      )
        continue;
    }
    const post = await manager.findOne(TradePost, {
      where: { id: candidate.post.id, ownerId: Not(IsNull()) },
      lock: { mode: 'pessimistic_read' },
    });
    if (post) return { ...candidate, post };
  }
  return null;
}
