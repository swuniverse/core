import { DataSource } from 'typeorm';
import { GameGateway } from '../websocket/game.gateway';
import { MessagingService } from '../messaging/messaging.service';
import type { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { CrewEnhancementEvent } from './crew-expertise';
import { CrewEnhancementService } from './crew-enhancement.service';
import { DeflectorConsequence } from './deflector-consequence';
import { SpacecraftStatus, type Spacecraft } from './entities/spacecraft.entity';
import { FlightConsequencePipeline } from './flight-consequence-pipeline';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';

const NEBULA = { id: 102, name: 'Deuterium-Nebel', energyCost: 2, damage: 12, specialDamage: 0 };

const field = (type: Partial<GalaxyFieldType> = {}) =>
  ({ cx: 3, cy: 4, fieldTypeId: NEBULA.id, fieldType: { ...NEBULA, ...type } }) as never;

function ship(overrides: Partial<Spacecraft> = {}): Spacecraft {
  return {
    id: 7,
    userId: 3,
    name: 'Falcon',
    status: SpacecraftStatus.IDLE,
    energy: 50,
    hull: 1000,
    hullMax: 1000,
    shields: 40,
    shieldsMax: 100,
    runtimeSystems: {
      DEFLECTOR: { active: true, cooldown: 0, integrity: 100 },
      SHIELDS: { active: true, cooldown: 0, integrity: 100 },
    },
    ...overrides,
  } as Spacecraft;
}

describe('DeflectorConsequence', () => {
  const messaging = { sendSystem: jest.fn(async () => undefined) };
  const gateway = { emitToUser: jest.fn() };
  const destruction = { destroyInManager: jest.fn(async () => null) };
  const crew = { enhanceSpacecraft: jest.fn(async () => undefined) };
  const fieldTypes = { findOneBy: jest.fn() };
  const manager = { name: 'manager' };
  const dataSource = {
    getRepository: () => fieldTypes,
    transaction: jest.fn(async (work: (m: unknown) => Promise<unknown>) => work(manager)),
  };
  // The first sorted healthy system takes the hull-loss system damage.
  const consequence = new DeflectorConsequence(
    dataSource as unknown as DataSource,
    messaging as unknown as MessagingService,
    gateway as unknown as GameGateway,
    destruction as unknown as SpacecraftDestructionService,
    crew as unknown as CrewEnhancementService,
    () => 0,
  );

  beforeEach(() => jest.clearAllMocks());

  it('keeps the fixed jump cost while applying destination special damage', async () => {
    const target = ship({ energy: 16 });
    await consequence.onEnterField(target, field({ specialDamage: 60 }), [], undefined, { navicomputerJump: true });
    expect(target).toMatchObject({ energy: 16, shields: 0, hull: 980 });
    expect(messaging.sendSystem).toHaveBeenCalled();
  });

  it('takes no EPS and no damage per field with a powered deflector', async () => {
    const target = ship();
    const messages: string[] = [];

    await consequence.onEnterField(target, field(), messages);

    expect(target).toMatchObject({ energy: 50, hull: 1000, shields: 40 });
    expect(messages).toEqual([]);
    expect(messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('applies the field damage to shields first, then hull, when the EPS is empty', async () => {
    const target = ship({ energy: 0 });
    const messages: string[] = [];

    await consequence.onEnterField(target, field(), messages);

    // 12 % of 1000 hull = 120: the 40 shields absorb, 80 reach the hull.
    expect(target).toMatchObject({ energy: 0, shields: 0, hull: 920 });
    expect(messages[0]).toBe('Nicht genug Energie für den Deflektor.: Die Falcon wurde in Sektor 3|4 beschädigt');
    expect(messages).toContain('- Hüllenschaden: 80 - Status: 920');
    expect(messaging.sendSystem).toHaveBeenCalledWith(3, expect.stringContaining('Sektor 3|4'), undefined, expect.anything());
    expect(crew.enhanceSpacecraft).not.toHaveBeenCalled();
  });

  it('rewards the navigator for a warp flight without deflector energy (STU)', async () => {
    const target = ship({ energy: 0 });
    (target.runtimeSystems as Record<string, unknown>).WARPDRIVE = { active: true, cooldown: 0, integrity: 100 };

    await consequence.onEnterField(target, field(), []);

    expect(crew.enhanceSpacecraft).toHaveBeenCalledWith(7, CrewEnhancementEvent.WARP_FLIGHT_WITHOUT_DEFLECTOR_ENERGY, undefined);
  });

  it('applies the field damage with a destroyed deflector regardless of the EPS', async () => {
    const target = ship();
    target.runtimeSystems = { DEFLECTOR: { active: true, cooldown: 0, integrity: 0 } };
    const messages: string[] = [];

    await consequence.onEnterField(target, field(), messages);

    expect(target).toMatchObject({ energy: 50, shields: 40, hull: 880 });
    expect(messages[0]).toBe('Deflektor außer Funktion.: Die Falcon wurde in Sektor 3|4 beschädigt');
  });

  it('ignores the deflector consequence for small craft without a deflector system', async () => {
    const target = ship({ runtimeSystems: {} });
    const messages: string[] = [];

    await consequence.onEnterField(target, field(), messages);

    expect(target).toMatchObject({ energy: 50, hull: 1000 });
    expect(messages).toEqual([]);
  });

  it('applies special damage as absolute damage before the deflector consequence', async () => {
    const target = ship();
    const messages: string[] = [];

    await consequence.onEnterField(target, field({ name: 'Brennender Nebel', energyCost: 5, specialDamage: 30 }), messages);

    expect(target).toMatchObject({ shields: 10, hull: 1000, energy: 50 });
    expect(messages[0]).toBe('Brennender Nebel in Sektor 3|4: Die Falcon wurde in Sektor 3|4 beschädigt');
  });

  it('applies neither deflector cost nor field damage on fields without energy cost', async () => {
    const target = ship({ runtimeSystems: {} });

    await consequence.onEnterField(target, field({ energyCost: 0 }), []);

    expect(target).toMatchObject({ energy: 50, hull: 1000, shields: 40 });
  });

  it('destroys the ship through the destruction service when the hull reaches zero', async () => {
    const target = ship({ hull: 50, shields: 0 });

    await consequence.onEnterField(target, field({ name: 'Roter Riese', specialDamage: 5000 }), []);

    expect(destruction.destroyInManager).toHaveBeenCalledWith(
      manager,
      7,
      'FIELD_DAMAGE',
      undefined,
      'Die Falcon wurde beim Einflug in Sektor 3|4 (Roter Riese) zerstört',
    );
    expect(target.status).toBe(SpacecraftStatus.DESTROYED);
    // A destroyed ship pays no deflector cost.
    expect(target.energy).toBe(50);
  });

  it('skips a towed ship so it pays no deflector cost (sc-WP-TRACT-1a)', async () => {
    const target = ship({ energy: 1 });

    await consequence.onEnterField(target, field(), [], undefined, { towed: true });

    expect(target).toMatchObject({ energy: 1, hull: 1000 });
  });

  it('loads the field type when the field relation is not hydrated', async () => {
    fieldTypes.findOneBy.mockResolvedValue(NEBULA);
    const target = ship();

    await consequence.onEnterField(target, { sx: 2, sy: 5, fieldTypeId: NEBULA.id } as never, []);

    expect(fieldTypes.findOneBy).toHaveBeenCalledWith({ id: NEBULA.id });
    expect(target.energy).toBe(50);
  });

  it('runs once per entered field in the pipeline', async () => {
    const pipeline = new FlightConsequencePipeline([consequence]);
    const target = ship();

    await pipeline.onEnterField(target, field());
    await pipeline.onEnterField(target, field());
    await pipeline.onEnterField(target, field());

    expect(target.energy).toBe(50);
  });
});
