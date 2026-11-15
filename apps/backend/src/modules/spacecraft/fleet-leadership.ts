import type { EntityManager } from 'typeorm';
import { Not } from 'typeorm';
import { Fleet } from './entities/fleet.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import type { OrbitOrderLifecycle } from './orbit-order-lifecycle.port';

const NOTHING = async (): Promise<void> => undefined;

/**
 * STU `LeaveFleet`/`ChangeFleetLeader` for a ship that is being destroyed,
 * inside the destroying transaction and before its row is removed. A
 * destroyed leader hands the fleet to the remaining member with the lowest
 * id; without members the fleet is deleted and its orbit order ends through
 * the central cancellation (STU `CancelColonyBlockOrDefend`). A fleet orbit
 * order held by the destroyed ship moves to the fleet leader, so the
 * blockade or defense stays with the fleet like in STU. Returns the
 * notifications to send after the commit.
 */
export async function leaveFleetOnDestruction(
  manager: EntityManager,
  ship: Pick<Spacecraft, 'id' | 'fleetId'>,
  orbitOrders?: OrbitOrderLifecycle | null,
): Promise<() => Promise<void>> {
  if (ship.fleetId == null) return NOTHING;
  const fleet = await manager.findOne(Fleet, {
    where: { id: ship.fleetId },
    lock: { mode: 'for_no_key_update' },
  });
  if (!fleet) return NOTHING;

  let leaderId = fleet.leaderId;
  if (fleet.leaderId === ship.id) {
    const successor = await manager.findOne(Spacecraft, {
      where: {
        fleetId: fleet.id,
        id: Not(ship.id),
        status: Not(SpacecraftStatus.DESTROYED),
      },
      order: { id: 'ASC' },
    });
    if (!successor) {
      const notify = (await orbitOrders?.cancelForFleet(manager, fleet.id)) ?? NOTHING;
      await manager.update(Spacecraft, ship.id, { fleetId: null });
      await manager.delete(Fleet, fleet.id);
      return notify;
    }
    leaderId = successor.id;
    await manager.update(Fleet, fleet.id, { leaderId });
  }
  await manager.query(
    'UPDATE "colony_orbit_assignments" SET "spacecraftId" = $1 WHERE "spacecraftId" = $2 AND "fleetId" = $3',
    [leaderId, ship.id, fleet.id],
  );
  return NOTHING;
}
