import { validate } from 'class-validator';
import { NavicomputerJumpRequest } from './navicomputer-jump.controller';
import { validateJumpParticipants } from './navicomputer-jump.service';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import type { Spacecraft } from './entities/spacecraft.entity';

function participant(id = 1): Spacecraft {
  return {
    id,
    name: `Ship ${id}`,
    userId: 1,
    status: 'IDLE',
    kind: 'SHIP',
    energy: 55,
    locationId: 1,
    location: {
      id: 1,
      kind: 'GALAXY_FIELD',
      galaxyField: { layerId: 1, cx: 1, cy: 1 },
    },
    modules: [
      {
        category: 'SPECIAL',
        moduleType: 'Hyperraum-Spule',
        integrity: 100,
        cooldown: 0,
        isActive: false,
      },
      {
        category: 'HYPERDRIVE',
        moduleType: 'Hyperantrieb',
        integrity: 100,
        cooldown: 0,
        isActive: true,
      },
    ],
    runtimeSystems: {},
  } as Spacecraft;
}

describe('Navicomputer jump authorization', () => {
  const now = 1_800_000_000_000;
  it('accepts an inactive coil, active drive and exactly 55 EPS on every member', () => {
    expect(() =>
      validateJumpParticipants([participant(), participant(2)], 1, now),
    ).not.toThrow();
  });
  it.each([
    [
      'foreign ownership',
      (ship: Spacecraft) => {
        ship.userId = 2;
      },
    ],
    [
      'station',
      (ship: Spacecraft) => {
        ship.kind = 'STATION' as Spacecraft['kind'];
      },
    ],
    [
      'standby',
      (ship: Spacecraft) => {
        ship.operatingMode = 'STANDBY' as Spacecraft['operatingMode'];
      },
    ],
    [
      'combat',
      (ship: Spacecraft) => {
        ship.status = 'IN_COMBAT' as Spacecraft['status'];
      },
    ],
    [
      'destroyed',
      (ship: Spacecraft) => {
        ship.status = 'DESTROYED' as Spacecraft['status'];
      },
    ],
    [
      'under construction',
      (ship: Spacecraft) => {
        ship.status = 'UNDER_CONSTRUCTION' as Spacecraft['status'];
      },
    ],
    [
      'different position',
      (ship: Spacecraft) => {
        ship.location.galaxyField!.cx = 2;
      },
    ],
    [
      'inside system',
      (ship: Spacecraft) => {
        ship.location = {
          kind: 'SYSTEM_FIELD',
          systemField: { starSystemId: 1, sx: 1, sy: 1 },
        } as Spacecraft['location'];
      },
    ],
    [
      'no coil',
      (ship: Spacecraft) => {
        ship.modules.shift();
      },
    ],
    [
      'destroyed backing coil with forged runtime',
      (ship: Spacecraft) => {
        ship.modules[0].integrity = 0;
      },
    ],
    [
      'destroyed runtime coil',
      (ship: Spacecraft) => {
        initializeSpacecraftRuntimeSystems(ship).HYPERSPACE_COIL!.integrity = 0;
      },
    ],
    [
      'no drive',
      (ship: Spacecraft) => {
        ship.modules.pop();
      },
    ],
    [
      'destroyed backing drive',
      (ship: Spacecraft) => {
        ship.modules[1].integrity = 0;
      },
    ],
    [
      'destroyed runtime drive',
      (ship: Spacecraft) => {
        initializeSpacecraftRuntimeSystems(ship).WARPDRIVE!.integrity = 0;
      },
    ],
    [
      'inactive drive',
      (ship: Spacecraft) => {
        initializeSpacecraftRuntimeSystems(ship).WARPDRIVE!.active = false;
      },
    ],
    [
      'towing',
      (ship: Spacecraft) => {
        ship.tractoredShipId = 3;
      },
    ],
    [
      'active tractor',
      (ship: Spacecraft) => {
        ship.modules.push({
          category: 'TRACTOR_BEAM',
          moduleType: 'Traktor',
          integrity: 100,
          isActive: true,
          cooldown: 0,
        } as Spacecraft['modules'][number]);
        initializeSpacecraftRuntimeSystems(ship).TRACTOR_BEAM!.active = true;
      },
    ],
    [
      '54 EPS',
      (ship: Spacecraft) => {
        ship.energy = 54;
      },
    ],
    [
      'invalid EPS',
      (ship: Spacecraft) => {
        ship.energy = NaN;
      },
    ],
    [
      'coil deadline',
      (ship: Spacecraft) => {
        initializeSpacecraftRuntimeSystems(ship).HYPERSPACE_COIL!.cooldown =
          now + 1;
      },
    ],
    [
      'coil ticks',
      (ship: Spacecraft) => {
        ship.modules[0].cooldown = 1;
      },
    ],
    [
      'drive deadline',
      (ship: Spacecraft) => {
        initializeSpacecraftRuntimeSystems(ship).WARPDRIVE!.cooldown = now + 1;
      },
    ],
    [
      'drive ticks',
      (ship: Spacecraft) => {
        ship.modules[1].cooldown = 1;
      },
    ],
  ])(
    'rejects the entire fleet for %s on the second member',
    (_reason, change) => {
      const ships = [participant(), participant(2)];
      initializeSpacecraftRuntimeSystems(ships[1]);
      change(ships[1]);
      expect(() => validateJumpParticipants(ships, 1, now)).toThrow();
      expect(ships.map((ship) => ship.energy)).toEqual(
        _reason === '54 EPS'
          ? [55, 54]
          : _reason === 'invalid EPS'
            ? [55, NaN]
            : [55, 55],
      );
      expect(ships[0].locationId).toBe(1);
    },
  );
  it('accepts the exact cooldown expiry and persisted runtime drive activation', () => {
    const ship = participant();
    const systems = initializeSpacecraftRuntimeSystems(ship);
    systems.HYPERSPACE_COIL!.cooldown = now;
    ship.modules[1].isActive = false; // The runtime state is authoritative after a normal drive toggle.
    expect(() => validateJumpParticipants([ship], 1, now)).not.toThrow();
  });
  it('never creates a phantom coil without modules or from stale runtime state', () => {
    const ship = participant();
    initializeSpacecraftRuntimeSystems(ship);
    ship.modules = [];
    expect(
      initializeSpacecraftRuntimeSystems(ship).HYPERSPACE_COIL,
    ).toBeUndefined();
    ship.modules = undefined as unknown as Spacecraft['modules'];
    expect(
      initializeSpacecraftRuntimeSystems(ship).HYPERSPACE_COIL,
    ).toBeUndefined();
  });
  it.each([
    { layerId: 0, x: 1, y: 1 },
    { layerId: 1, x: 1.2, y: 1 },
    { layerId: 1, x: 1, y: -1 },
    { layerId: 1, x: 2147483648, y: 1 },
  ])('rejects malformed destination %j at the API boundary', async (target) => {
    expect(
      await validate(Object.assign(new NavicomputerJumpRequest(), target)),
    ).not.toHaveLength(0);
  });
});
