import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager, In, QueryFailedError } from 'typeorm';
import { Fleet } from './entities/fleet.entity';
import { Spacecraft } from './entities/spacecraft.entity';

export interface LockedFleetParticipants {
  fleet: Fleet | null;
  ship: Spacecraft;
  members: Spacecraft[];
}

/**
 * Caller-owned READ COMMITTED transaction; call before taking spacecraft locks.
 * Lock the fleet first, then the complete member set plus initiating ship in ID
 * order. Ship locks use NOWAIT: existing ship-first writers must never form an
 * inverse wait cycle with us. Contention or changed membership refuses the whole
 * operation; retry only in a fresh transaction, never by adding a fleet lock.
 * No-key-update still serializes fleet writers, without blocking FK key shares.
 * This selects all members, not the partial ordinary-flight subset.
 */
export async function lockFleetParticipants(
  manager: EntityManager,
  userId: number,
  shipId: number,
  targetFleetId?: number,
): Promise<LockedFleetParticipants> {
  if (!manager.queryRunner?.isTransactionActive) {
    throw new Error('Fleet participant locks require a caller transaction');
  }
  const hint = await manager.findOneBy(Spacecraft, { id: shipId, userId });
  if (!hint) throw new NotFoundException('Spacecraft not found');
  const fleetId = targetFleetId ?? hint.fleetId;
  const fleet =
    fleetId == null
      ? null
      : await manager.findOne(Fleet, {
          where: { id: fleetId, userId },
          lock: { mode: 'for_no_key_update' },
        });
  if (fleetId != null && !fleet)
    throw new NotFoundException('Flotte nicht gefunden');

  const candidates = fleet
    ? await manager.findBy(Spacecraft, { fleetId: fleet.id })
    : [];
  const ids = [
    ...new Set([shipId, ...candidates.map((member) => member.id)]),
  ].sort((a, b) => a - b);
  let locked: Spacecraft[];
  try {
    locked = await manager
      .createQueryBuilder(Spacecraft, 'ship')
      .where({ id: In(ids) })
      .orderBy('ship.id', 'ASC')
      .setLock('pessimistic_write')
      .setOnLocked('nowait')
      .getMany();
  } catch (error) {
    if (
      error instanceof QueryFailedError &&
      error.driverError.code === '55P03'
    ) {
      throw new BadRequestException(
        'Flottenzustand ist gesperrt; bitte erneut versuchen',
      );
    }
    throw error;
  }
  const ship = locked.find((member) => member.id === shipId);
  if (!ship || ship.userId !== userId)
    throw new NotFoundException('Spacecraft not found');
  if (targetFleetId === undefined && ship.fleetId !== fleetId) {
    throw new BadRequestException(
      'Flottenmitgliedschaft hat sich geändert; bitte erneut versuchen',
    );
  }
  const members = fleet
    ? locked.filter((member) => member.fleetId === fleet.id)
    : [];
  const current = fleet
    ? await manager.findBy(Spacecraft, { fleetId: fleet.id })
    : [];
  if (
    current.length !== members.length ||
    current.some(
      (member) =>
        !members.some((lockedMember) => lockedMember.id === member.id),
    )
  ) {
    throw new BadRequestException(
      'Flottenmitgliedschaft hat sich geändert; bitte erneut versuchen',
    );
  }
  if (
    fleet &&
    (!members.some((member) => member.id === fleet.leaderId) ||
      members.some((member) => member.userId !== userId))
  ) {
    throw new BadRequestException(
      'Flottenmitgliedschaft hat sich geändert; bitte erneut versuchen',
    );
  }
  // Hydrate positions only after the row locks; never lock nullable joins.
  const hydrated = await manager.find(Spacecraft, {
    where: { id: In(ids) },
    order: { id: 'ASC' },
    relations: [
      'location',
      'location.galaxyField',
      'location.galaxyField.layer',
      'location.galaxyField.starSystem',
      'location.systemField',
      'location.systemField.starSystem',
      'location.systemField.celestialObject',
    ],
  });
  for (const member of locked) {
    member.location = hydrated.find((row) => row.id === member.id)!.location;
  }
  return { fleet, ship, members };
}
