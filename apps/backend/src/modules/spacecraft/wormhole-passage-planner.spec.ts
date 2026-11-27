import { planWormholePassage } from './wormhole-passage-planner';
import {
  SpacecraftKind,
  SpacecraftOperatingMode,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
import type { Spacecraft } from './entities/spacecraft.entity';
import type { WormholeDto } from '../starmap/wormhole.service';
import type { GalaxyField } from '../starmap/entities/galaxy-field.entity';

const ship = (): Spacecraft =>
  ({
    id: 7,
    userId: 1,
    kind: SpacecraftKind.SHIP,
    operatingMode: SpacecraftOperatingMode.NORMAL,
    status: SpacecraftStatus.IDLE,
    locationId: 10,
    location: {
      id: 10,
      kind: 'GALAXY_FIELD',
      galaxyField: { layerId: 1, cx: 2, cy: 3 },
    },
    energy: 10,
    warpdrive: 0,
    modules: [
      {
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'drive',
        isActive: true,
        integrity: 100,
        cooldown: 0,
      },
    ],
    runtimeSystems: {
      SUBLIGHT_DRIVE: { active: true, integrity: 100, cooldown: 0 },
    },
  }) as unknown as Spacecraft;

const wormhole = (): WormholeDto => ({
  id: 5,
  entryLayerId: 1,
  entryCx: 2,
  entryCy: 3,
  exitLayerId: 2,
  exitCx: 8,
  exitCy: 9,
  isBidirectional: false,
  isRandomExit: false,
  isActive: true,
  name: null,
});

const field = (
  id: number,
  layerId: number,
  cx: number,
  cy: number,
  isPassable = true,
): GalaxyField => ({ id, layerId, cx, cy, isPassable }) as GalaxyField;

describe('wormhole passage planner', () => {
  it('plans an entry to the configured galaxy field without moving the ship', async () => {
    const participant = ship();
    const before = structuredClone(participant);
    const result = await planWormholePassage({
      userId: 1,
      ships: [participant],
      wormholes: [wormhole()],
      fields: [field(20, 2, 8, 9)],
    });
    expect(result).toEqual({
      wormholeId: 5,
      direction: 'ENTRY',
      origin: { layerId: 1, cx: 2, cy: 3 },
      destination: { id: 20, layerId: 2, cx: 8, cy: 9 },
      participants: [{ shipId: 7, activateSublight: false, activationEps: 0 }],
    });
    expect(participant).toEqual(before);
  });

  it('rejects absent, inactive, one-way reverse and ambiguous wormholes and respects an explicit selection', async () => {
    const input = {
      userId: 1,
      ships: [ship()],
      wormholes: [wormhole()],
      fields: [field(20, 2, 8, 9)],
    };
    await expect(
      planWormholePassage({ ...input, wormholes: [] }),
    ).rejects.toThrow('Wormhole not available');
    await expect(
      planWormholePassage({
        ...input,
        wormholes: [{ ...wormhole(), isActive: false }],
      }),
    ).rejects.toThrow('Wormhole not available');
    const reverse = ship();
    reverse.location.galaxyField = { layerId: 2, cx: 8, cy: 9 } as GalaxyField;
    await expect(
      planWormholePassage({ ...input, ships: [reverse] }),
    ).rejects.toThrow('Wormhole not available');
    const choices = [wormhole(), { ...wormhole(), id: 6 }];
    await expect(
      planWormholePassage({ ...input, wormholes: choices }),
    ).rejects.toThrow('Select a wormhole');
    expect(
      (
        await planWormholePassage({
          ...input,
          wormholes: choices,
          wormholeId: 6,
        })
      ).wormholeId,
    ).toBe(6);
    await expect(
      planWormholePassage({ ...input, wormholeId: 99 }),
    ).rejects.toThrow('Wormhole not available');
  });

  it('plans each inactive drive activation at its own cost and rejects insufficient EPS without mutation', async () => {
    const first = ship();
    first.runtimeSystems.SUBLIGHT_DRIVE = {
      active: false,
      integrity: 100,
      cooldown: 0,
    };
    const second = ship();
    second.id = 8;
    second.energy = 4;
    second.runtimeSystems.SUBLIGHT_DRIVE = {
      active: false,
      integrity: 100,
      cooldown: 0,
    };
    const input = {
      userId: 1,
      ships: [first, second],
      wormholes: [wormhole()],
      fields: [field(20, 2, 8, 9)],
      activationEps: (participant: Spacecraft) =>
        participant.id === 7 ? 2 : 5,
    };
    const before = structuredClone(input.ships);
    await expect(planWormholePassage(input)).rejects.toThrow('Not enough EPS');
    expect(input.ships).toEqual(before);
    second.energy = 5;
    expect((await planWormholePassage(input)).participants).toEqual([
      { shipId: 7, activateSublight: true, activationEps: 2 },
      { shipId: 8, activateSublight: true, activationEps: 5 },
    ]);
  });

  it('rejects participants whose installed modules were not loaded', async () => {
    const participant = ship();
    participant.modules = undefined as unknown as Spacecraft['modules'];
    await expect(
      planWormholePassage({
        userId: 1,
        ships: [participant],
        wormholes: [wormhole()],
        fields: [field(20, 2, 8, 9)],
      }),
    ).rejects.toThrow('modules not loaded');
  });

  it('requires a functional drive on entry, including if it is already active', async () => {
    const input = {
      userId: 1,
      ships: [ship()],
      wormholes: [wormhole()],
      fields: [field(20, 2, 8, 9)],
    };
    for (const [state, message] of [
      [undefined, 'Kein Impulsantrieb'],
      [{ active: true, integrity: 0, cooldown: 0 }, 'Impulsantrieb zerstört'],
      [{ active: true, integrity: 100, cooldown: 1 }, 'Impulsantrieb kühlt'],
    ] as const) {
      const participant = ship();
      participant.runtimeSystems = state ? { SUBLIGHT_DRIVE: state } : {};
      if (!state) participant.modules = [];
      await expect(
        planWormholePassage({ ...input, ships: [participant] }),
      ).rejects.toThrow(message);
    }
    const uninstalled = ship();
    uninstalled.modules = [];
    await expect(
      planWormholePassage({ ...input, ships: [uninstalled] }),
    ).rejects.toThrow('Kein Impulsantrieb');
    const inactive = ship();
    inactive.runtimeSystems.SUBLIGHT_DRIVE = {
      active: false,
      integrity: 100,
      cooldown: 0,
    };
    inactive.energy = 0;
    expect(
      (await planWormholePassage({ ...input, ships: [inactive] }))
        .participants[0],
    ).toEqual({ shipId: 7, activateSublight: true, activationEps: 0 });
  });

  it('checks the access policy for every participant and fails closed', async () => {
    const input = {
      userId: 1,
      ships: [ship(), { ...ship(), id: 8 }],
      wormholes: [wormhole()],
      fields: [field(20, 2, 8, 9)],
    };
    await expect(
      planWormholePassage({
        ...input,
        accessPolicy: { allows: async (participant) => participant.id !== 8 },
      }),
    ).rejects.toThrow('keine Berechtigung');
    await expect(
      planWormholePassage({
        ...input,
        accessPolicy: {
          allows: async () => {
            throw new Error('policy unavailable');
          },
        },
      }),
    ).rejects.toThrow('Du hast keine Berechtigung um in das Wurmloch einzufliegen');
  });

  it('validates every participant before producing a plan', async () => {
    const input = {
      userId: 1,
      ships: [ship()],
      wormholes: [wormhole()],
      fields: [field(20, 2, 8, 9)],
    };
    const cases: [Partial<Spacecraft>, string][] = [
      [{ userId: 2 }, 'ownership'],
      [{ kind: SpacecraftKind.STATION }, 'Stationen'],
      [{ operatingMode: SpacecraftOperatingMode.STANDBY }, 'Standby'],
      [{ status: SpacecraftStatus.IN_COMBAT }, 'combat'],
      [{ status: SpacecraftStatus.DESTROYED }, 'destroyed'],
      [
        {
          runtimeSystems: {
            WARPDRIVE: { active: true, integrity: 100, cooldown: 0 },
          },
          modules: [
            {
              category: 'HYPERDRIVE',
              moduleType: 'hyperdrive',
              isActive: true,
              integrity: 100,
              cooldown: 0,
            } as Spacecraft['modules'][number],
          ],
        },
        'Warpantrieb',
      ],
      [
        { location: { kind: 'SYSTEM_FIELD' } as Spacecraft['location'] },
        'galaxy field',
      ],
    ];
    for (const [changes, message] of cases) {
      const second = Object.assign(ship(), { id: 8 }, changes);
      await expect(
        planWormholePassage({ ...input, ships: [ship(), second] }),
      ).rejects.toThrow(message);
    }
    const elsewhere = ship();
    elsewhere.id = 8;
    elsewhere.location.galaxyField = {
      layerId: 1,
      cx: 3,
      cy: 3,
    } as GalaxyField;
    await expect(
      planWormholePassage({ ...input, ships: [ship(), elsewhere] }),
    ).rejects.toThrow('same field');
    await expect(planWormholePassage({ ...input, ships: [] })).rejects.toThrow(
      'No ships',
    );
    await expect(
      planWormholePassage({ ...input, ships: [ship(), ship()] }),
    ).rejects.toThrow('Duplicate ship');
  });

  it('rejects a missing or impassable configured destination field', async () => {
    const input = {
      userId: 1,
      ships: [ship()],
      wormholes: [wormhole()],
      fields: [],
    };
    await expect(planWormholePassage(input)).rejects.toThrow(
      'Destination field not found',
    );
    await expect(
      planWormholePassage({ ...input, fields: [field(20, 2, 8, 9, false)] }),
    ).rejects.toThrow('not passable');
  });

  it('chooses a passable target-layer field with the injected RNG and rejects an empty destination', async () => {
    const input = {
      userId: 1,
      ships: [ship()],
      wormholes: [{ ...wormhole(), isRandomExit: true }],
      fields: [
        field(1, 2, 1, 1, false),
        field(2, 1, 2, 2),
        field(3, 2, 3, 3),
        field(4, 2, 4, 4),
      ],
      random: () => 0.75,
    };
    expect((await planWormholePassage(input)).destination).toEqual({
      id: 4,
      layerId: 2,
      cx: 4,
      cy: 4,
    });
    await expect(
      planWormholePassage({ ...input, fields: [field(1, 2, 1, 1, false)] }),
    ).rejects.toThrow('No passable destination');
  });

  it('plans reverse exit only for a bidirectional wormhole without requiring a drive', async () => {
    const participant = ship();
    participant.location.galaxyField = {
      layerId: 2,
      cx: 8,
      cy: 9,
    } as GalaxyField;
    participant.runtimeSystems = {};
    const result = await planWormholePassage({
      userId: 1,
      ships: [participant],
      wormholes: [{ ...wormhole(), isBidirectional: true }],
      fields: [field(10, 1, 2, 3)],
    });
    expect(result.direction).toBe('EXIT');
    expect(result.destination).toEqual({ id: 10, layerId: 1, cx: 2, cy: 3 });
    expect(result.participants).toEqual([
      { shipId: 7, activateSublight: false, activationEps: 0 },
    ]);
  });

  it('checks the access policy on exit with the STU exit message', async () => {
    const participant = ship();
    participant.location.galaxyField = {
      layerId: 2,
      cx: 8,
      cy: 9,
    } as GalaxyField;
    const directions: string[] = [];
    await expect(
      planWormholePassage({
        userId: 1,
        ships: [participant],
        wormholes: [{ ...wormhole(), isBidirectional: true }],
        fields: [field(10, 1, 2, 3)],
        accessPolicy: {
          allows: async (_ship, _hole, direction) => {
            directions.push(direction);
            return direction === 'ENTRY';
          },
        },
      }),
    ).rejects.toThrow('Du hast keine Berechtigung um das Wurmloch zu verlassen');
    expect(directions).toEqual(['EXIT']);
  });
});
