import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { ShipColonyContextService } from './ship-colony-context.service';
import { TransferService } from './transfer.service';

/** col-AUD-11c: colony-initiated beaming with foreign ships in its orbit. */
describe('colony beaming with foreign orbit ships (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  const COMMODITY = 7;

  async function setup({
    shields = false,
    cloak = false,
    friend = false,
  } = {}) {
    const colonist = await createUser(source);
    const captain = await createUser(source);
    const layer = await source
      .getRepository('Layer')
      .save({ name: 'Beam', width: 10, height: 10 });
    const system = await source.getRepository('StarSystem').save({
      name: 'Bespin',
      cx: 1,
      cy: 1,
      layerId: layer.id,
      systemTypeId: 1,
    });
    const fieldTypeId = (
      await source.getRepository('GalaxyFieldType').findOneByOrFail({})
    ).id;
    const systemField = await source
      .getRepository('SystemField')
      .save({ starSystemId: system.id, sx: 2, sy: 3, fieldTypeId });
    const location = await source
      .getRepository('SpaceLocation')
      .findOneByOrFail({ systemFieldId: systemField.id });
    const colony = await source.getRepository('Colony').save({
      name: 'Wolkenstadt',
      userId: colonist.id,
      starSystemId: system.id,
      systemFieldId: systemField.id,
      posX: 2,
      posY: 3,
      colonyClassId: 1,
    });
    await source
      .getRepository('ColonyChangeable')
      .save({ colonyId: colony.id, isBlockaded: false, energy: 50 });
    await source
      .getRepository('ColonyStorage')
      .save({ colonyId: colony.id, commodityId: COMMODITY, amount: 40 });
    const shipClass = await source.getRepository('ShipClassDef').save({
      key: 'BEAM_FREIGHTER',
      name: 'Frachter',
      category: 'SHIP',
      role: 'SHIP',
    });
    const ship = await source.getRepository('Spacecraft').save({
      name: 'Rasender Falke',
      userId: captain.id,
      shipClassId: shipClass.id,
      locationId: location.id,
      cargoUsed: 5,
      cargoMax: 100,
      runtimeSystems: {
        SHIELDS: { active: shields },
        CLOAK: { active: cloak },
      },
    });
    await source
      .getRepository('CargoItem')
      .save({ spacecraftId: ship.id, commodityId: COMMODITY, amount: 5 });

    const gameData = {
      getCommodity: () => ({ name: 'Tibanna', isBeamable: true }),
    };
    const relationships = {
      resolve: jest.fn(async () => ({
        mayTransferSafely: friend,
        mayProvisionProtectedShip: friend,
      })),
    };
    const messaging = { sendSystem: jest.fn(async () => undefined) };
    const context = new ShipColonyContextService(
      source.getRepository('Spacecraft') as never,
      source.getRepository('Colony') as never,
      source.getRepository('CrewAssignment') as never,
      source.getRepository('ColonyStorage') as never,
      source.getRepository('CargoItem') as never,
      { getFreeStorage: async () => 500 } as never,
      {} as never,
      gameData as never,
      { calculateSummary: () => ({ effectiveStorageMax: 1000 }) } as never,
      source.getRepository('User') as never,
      relationships as never,
      messaging as never,
    );
    const transfer = new TransferService(
      source.getRepository('CargoItem') as never,
      context,
      source,
      {} as never,
      {} as never,
      gameData as never,
      {} as never,
      {} as never,
    );
    return { colonist, captain, colony, ship, context, transfer, messaging };
  }

  const shipCargo = async (shipId: number) =>
    (
      await source
        .getRepository('CargoItem')
        .findOneBy({ spacecraftId: shipId, commodityId: COMMODITY })
    )?.amount;
  const colonyStock = async (colonyId: number) =>
    (
      await source
        .getRepository('ColonyStorage')
        .findOneByOrFail({ colonyId, commodityId: COMMODITY })
    ).amount;
  const colonyEnergy = async (colonyId: number) =>
    (await source.getRepository('ColonyChangeable').findOneByOrFail({ colonyId }))
      .energy;

  it('beams to and from an unshielded foreign ship, charges the colony and notifies the owner', async () => {
    const { colonist, captain, colony, ship, transfer, messaging } =
      await setup();

    await transfer.loadCargo(ship.id, colonist.id, colony.id, COMMODITY, 10, 'COLONY');
    expect(await shipCargo(ship.id)).toBe(15);
    expect(await colonyStock(colony.id)).toBe(30);
    expect(await colonyEnergy(colony.id)).toBe(48);

    await transfer.unloadCargo(ship.id, colonist.id, colony.id, COMMODITY, 15, 'COLONY');
    expect(await shipCargo(ship.id)).toBeUndefined();
    expect(await colonyStock(colony.id)).toBe(45);
    expect(await colonyEnergy(colony.id)).toBe(45);

    expect(messaging.sendSystem).toHaveBeenCalledTimes(2);
    expect(messaging.sendSystem).toHaveBeenCalledWith(
      captain.id,
      'Die Kolonie Wolkenstadt hat folgende Waren zur Rasender Falke gebeamt: 10 Tibanna',
      undefined,
      'TRADE',
    );
  });

  it('blocks shielded foreign ships for non-friends in both directions', async () => {
    const { colonist, colony, ship, transfer, messaging } = await setup({
      shields: true,
    });
    await expect(
      transfer.loadCargo(ship.id, colonist.id, colony.id, COMMODITY, 10, 'COLONY'),
    ).rejects.toThrow('Schilde müssen deaktiviert sein');
    await expect(
      transfer.unloadCargo(ship.id, colonist.id, colony.id, COMMODITY, 5, 'COLONY'),
    ).rejects.toThrow('Schilde müssen deaktiviert sein');
    expect(await colonyStock(colony.id)).toBe(40);
    expect(await colonyEnergy(colony.id)).toBe(50);
    expect(messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('lets friends supply a shielded ship but not take from it', async () => {
    const { colonist, colony, ship, transfer } = await setup({
      shields: true,
      friend: true,
    });
    await transfer.loadCargo(ship.id, colonist.id, colony.id, COMMODITY, 10, 'COLONY');
    expect(await shipCargo(ship.id)).toBe(15);
    await expect(
      transfer.unloadCargo(ship.id, colonist.id, colony.id, COMMODITY, 5, 'COLONY'),
    ).rejects.toThrow('Schilde müssen deaktiviert sein');
  });

  it('rejects cloaked foreign ships, ship-initiated foreign transfers and foreign crew transfer', async () => {
    const cloaked = await setup({ cloak: true });
    await expect(
      cloaked.transfer.loadCargo(cloaked.ship.id, cloaked.colonist.id, cloaked.colony.id, COMMODITY, 1, 'COLONY'),
    ).rejects.toThrow('Ship not found');
    expect(
      (await cloaked.context.getQuote(cloaked.ship.id, cloaked.colonist.id, cloaked.colony.id, 'COLONY')).available,
    ).toBe(false);

    await resetDatabase(source);
    const { colonist, colony, ship, transfer } = await setup();
    await expect(
      transfer.loadCargo(ship.id, colonist.id, colony.id, COMMODITY, 1),
    ).rejects.toThrow('Ship not found');
    await expect(
      transfer.loadCrew(ship.id, colonist.id, colony.id, 1),
    ).rejects.toThrow('Ship not found');
  });

  it('quotes a foreign ship without crew details and shows its cargo only when beaming from it', async () => {
    const { colonist, colony, ship, context } = await setup();
    const toShip = await context.getQuote(ship.id, colonist.id, colony.id, 'COLONY', 'TO_SHIP');
    expect(toShip).toMatchObject({
      available: true,
      cargo: { shipUsed: 5, shipMax: 100, colonyFree: 500 },
      shipCargo: [],
      colonyCargo: [{ commodityId: COMMODITY, amount: 40 }],
      crew: { shipCurrent: 0, shipMax: 0, colonyAvailable: 0, maxLoad: 0, maxUnload: 0 },
    });
    const toColony = await context.getQuote(ship.id, colonist.id, colony.id, 'COLONY', 'TO_COLONY');
    expect(toColony.shipCargo).toEqual([
      { commodityId: COMMODITY, commodityName: 'Tibanna', amount: 5 },
    ]);
    expect(toColony.colonyCargo).toEqual([]);
  });
});
