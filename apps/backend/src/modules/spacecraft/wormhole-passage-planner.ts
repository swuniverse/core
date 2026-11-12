import { BadRequestException } from '@nestjs/common';
import type { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import type { WormholeDto } from '../starmap/wormhole.service';
import type { Spacecraft } from './entities/spacecraft.entity';
import {
  resolveSpacecraftLocation,
  sameSpaceLocation,
} from './spacecraft-field';
import { assertSpacecraftNotInStandby } from './spacecraft-mode.util';
import {
  initializeSpacecraftRuntimeSystems,
  isCoolingDown,
} from './spacecraft-runtime-state.service';

export type WormholeDirection = 'ENTRY' | 'EXIT';

export interface WormholePassagePlan {
  readonly wormholeId: number;
  readonly direction: WormholeDirection;
  readonly origin: Readonly<{ layerId: number; cx: number; cy: number }>;
  readonly destination: Readonly<{
    id: number;
    layerId: number;
    cx: number;
    cy: number;
  }>;
  readonly participants: readonly Readonly<{
    shipId: number;
    activateSublight: boolean;
    activationEps: number;
  }>[];
}

export interface WormholeAccessPolicy {
  snapshot?(
    manager: import('typeorm').EntityManager,
    ships: readonly Spacecraft[],
    wormholes: readonly WormholeDto[],
  ): Promise<WormholeAccessPolicy>;
  allows(
    ship: Spacecraft,
    wormhole: WormholeDto,
    direction: 'ENTRY' | 'EXIT',
  ): boolean | Promise<boolean>;
}

export const allowAllWormholeAccess: WormholeAccessPolicy = {
  allows: () => true,
};

export interface WormholePassageInput {
  userId: number;
  ships: readonly Spacecraft[];
  wormholes: readonly WormholeDto[];
  fields: readonly GalaxyField[];
  wormholeId?: number;
  random?: () => number;
  /** Current impulse activation costs no EPS; future authoritative costs can be supplied per ship. */
  activationEps?: (ship: Spacecraft) => number;
  accessPolicy?: WormholeAccessPolicy;
}

/** Plans from transaction-scoped, fully hydrated snapshots; never persists or executes a passage. */
export async function planWormholePassage(
  input: WormholePassageInput,
): Promise<WormholePassagePlan> {
  if (!input.ships.length) throw new BadRequestException('No ships');
  if (new Set(input.ships.map((ship) => ship.id)).size !== input.ships.length)
    throw new BadRequestException('Duplicate ship');
  const systemsByShip = new Map<
    number,
    ReturnType<typeof initializeSpacecraftRuntimeSystems>
  >();
  const location = resolveSpacecraftLocation(input.ships[0]);
  if (location?.scope !== 'GALAXY')
    throw new BadRequestException('Ship is not on a galaxy field');
  for (const ship of input.ships) {
    if (ship.userId !== input.userId)
      throw new BadRequestException('Ship ownership required');
    if (ship.kind === 'STATION')
      throw new BadRequestException('Stationen können nicht fliegen');
    assertSpacecraftNotInStandby(ship, 'dem Flug');
    if (ship.status === 'IN_COMBAT')
      throw new BadRequestException('Cannot fly during combat');
    if (ship.status === 'DESTROYED')
      throw new BadRequestException('Ship is destroyed');
    if (ship.status === 'IN_FLIGHT')
      throw new BadRequestException('Ship already in flight');
    const current = resolveSpacecraftLocation(ship);
    if (current?.scope !== 'GALAXY')
      throw new BadRequestException('Ship is not on a galaxy field');
    if (!sameSpaceLocation(location, current))
      throw new BadRequestException('Ships must be on the same field');
    if (!ship.modules) throw new BadRequestException('Ship modules not loaded');
    const copy = {
      ...ship,
      runtimeSystems: Object.fromEntries(
        Object.entries(ship.runtimeSystems ?? {}).map(([key, value]) => [
          key,
          value && typeof value === 'object' ? { ...value } : value,
        ]),
      ),
    } as Spacecraft;
    const systems = initializeSpacecraftRuntimeSystems(copy);
    systemsByShip.set(ship.id, systems);
    if (systems.WARPDRIVE?.active)
      throw new BadRequestException('Der Warpantrieb ist aktiviert');
  }
  const candidates = input.wormholes.filter(
    (hole) =>
      hole.isActive &&
      ((hole.entryLayerId === location.layerId &&
        hole.entryCx === location.x &&
        hole.entryCy === location.y) ||
        (hole.isBidirectional &&
          hole.exitLayerId === location.layerId &&
          hole.exitCx === location.x &&
          hole.exitCy === location.y)),
  );
  if (input.wormholeId == null && candidates.length > 1)
    throw new BadRequestException('Select a wormhole');
  const wormhole =
    input.wormholeId == null
      ? candidates[0]
      : candidates.find((hole) => hole.id === input.wormholeId);
  if (!wormhole) throw new BadRequestException('Wormhole not available');
  const direction =
    location.layerId === wormhole.entryLayerId &&
    location.x === wormhole.entryCx &&
    location.y === wormhole.entryCy
      ? 'ENTRY'
      : 'EXIT';
  const policy = input.accessPolicy ?? allowAllWormholeAccess;
  for (const ship of input.ships) {
    let allowed = false;
    try {
      allowed = await policy.allows(ship, wormhole, direction);
    } catch {
      // An unavailable authorization source never grants passage.
    }
    if (!allowed)
      throw new BadRequestException(
        'Du hast keine Berechtigung, in das Wurmloch einzufliegen.',
      );
  }
  const participants = input.ships.map((ship) => {
    if (direction === 'EXIT')
      return { shipId: ship.id, activateSublight: false, activationEps: 0 };
    const drive = systemsByShip.get(ship.id)?.SUBLIGHT_DRIVE;
    if (!drive) throw new BadRequestException('Kein Impulsantrieb installiert');
    if (drive.integrity <= 0)
      throw new BadRequestException('Impulsantrieb zerstört');
    if (isCoolingDown(drive))
      throw new BadRequestException('Impulsantrieb kühlt noch ab');
    const activationEps = drive.active ? 0 : (input.activationEps?.(ship) ?? 0);
    if (!Number.isFinite(activationEps) || activationEps < 0)
      throw new BadRequestException('Invalid activation EPS');
    if (ship.energy < activationEps)
      throw new BadRequestException('Not enough EPS');
    return { shipId: ship.id, activateSublight: !drive.active, activationEps };
  });
  const target =
    direction === 'ENTRY'
      ? {
          layerId: wormhole.exitLayerId,
          cx: wormhole.exitCx,
          cy: wormhole.exitCy,
        }
      : {
          layerId: wormhole.entryLayerId,
          cx: wormhole.entryCx,
          cy: wormhole.entryCy,
        };
  let destination: GalaxyField | undefined;
  if (wormhole.isRandomExit) {
    const passable = input.fields.filter(
      (field) => field.layerId === target.layerId && field.isPassable,
    );
    if (!passable.length)
      throw new BadRequestException('No passable destination');
    const random = (input.random ?? Math.random)();
    if (!Number.isFinite(random) || random < 0 || random >= 1)
      throw new BadRequestException('Invalid random value');
    destination = passable[Math.floor(random * passable.length)];
  } else {
    destination = input.fields.find(
      (field) =>
        field.layerId === target.layerId &&
        field.cx === target.cx &&
        field.cy === target.cy,
    );
  }
  if (!destination)
    throw new BadRequestException('Destination field not found');
  if (!destination.isPassable)
    throw new BadRequestException('Destination field is not passable');
  return {
    wormholeId: wormhole.id,
    direction,
    origin: { layerId: location.layerId, cx: location.x, cy: location.y },
    destination: {
      id: destination.id,
      layerId: destination.layerId,
      cx: destination.cx,
      cy: destination.cy,
    },
    participants,
  };
}
