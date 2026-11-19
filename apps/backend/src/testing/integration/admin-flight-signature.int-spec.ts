import { DataSource } from 'typeorm';
import { AdminFlightSignatureService } from '../../modules/starmap/admin-flight-signature.service';
import { FlightSignatureService } from '../../modules/spacecraft/flight-signature.service';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from './database';

describe('Admin flight signature aggregation (PostgreSQL)', () => {
  let source: DataSource;
  let service: AdminFlightSignatureService;
  const now = new Date('2026-11-16T12:00:00Z');
  const bounds = { xStart: 1, xEnd: 2, yStart: 1, yEnd: 2 };
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
    service = new AdminFlightSignatureService(source);
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  async function setup() {
    const user = await createUser(source);
    const other = await createUser(source);
    const alliance = await source
      .getRepository('Alliance')
      .save({
        name: 'Test',
        factionId: (
          await source.getRepository('FactionEntity').findOneByOrFail({})
        ).id,
      });
    await source
      .getRepository('AllianceMembership')
      .save({ allianceId: alliance.id, userId: user.id });
    const layer = await source
      .getRepository('Layer')
      .save({ name: 'Trails', width: 5, height: 5 });
    const second = await source
      .getRepository('Layer')
      .save({ name: 'Other', width: 5, height: 5 });
    const type = await source
      .getRepository('GalaxyFieldType')
      .findOneByOrFail({});
    const at = async (layerId: number, cx: number, cy: number) => {
      const field = await source
        .getRepository('GalaxyField')
        .save({ layerId, cx, cy, fieldTypeId: type.id });
      const location = await source
        .getRepository('SpaceLocation')
        .findOneByOrFail({ galaxyFieldId: field.id });
      return { field, location };
    };
    const origin = await at(layer.id, 1, 1);
    const destination = await at(layer.id, 2, 1);
    const outside = await at(layer.id, 5, 5);
    const foreignLayer = await at(second.id, 1, 1);
    const add = async (
      locationId: number,
      spacecraftId: number,
      userId: number,
      fromDirection: string | null,
      toDirection: string | null,
      ageHours = 1,
      isCloaked = false,
    ) =>
      source.getRepository('FlightSignature').save({
        locationId,
        spacecraftId,
        userId,
        fromDirection,
        toDirection,
        shipClassId: 1,
        shipClassName: 'Test',
        spacecraftName: 'Test',
        isCloaked,
        createdAt: new Date(now.getTime() - ageHours * 3600000),
      });
    await add(origin.location.id, 101, user.id, null, 'EAST');
    await add(origin.location.id, 101, user.id, 'WEST', 'EAST');
    await add(origin.location.id, 102, other.id, 'NORTH', 'EAST', 20, true);
    await add(destination.location.id, 101, user.id, 'WEST', null);
    await add(origin.location.id, 103, user.id, null, 'SOUTH', 49);
    await add(origin.location.id, 104, user.id, null, 'SOUTH', -1);
    await add(outside.location.id, 105, user.id, null, 'SOUTH');
    await add(foreignLayer.location.id, 106, user.id, null, 'SOUTH');
    return { user, other, alliance, layer, origin, destination };
  }

  it('counts distinct ships per direction and excludes expired, future, out-of-bounds and other-layer trails', async () => {
    const { layer, origin, destination } = await setup();
    expect(await service.getFields(layer.id, bounds, now)).toEqual([
      {
        fieldId: origin.field.id,
        cx: 1,
        cy: 1,
        directions: { NORTH: 1, EAST: 2, SOUTH: 0, WEST: 1 },
      },
      {
        fieldId: destination.field.id,
        cx: 2,
        cy: 1,
        directions: { NORTH: 0, EAST: 0, SOUTH: 0, WEST: 1 },
      },
    ]);
  });

  it('filters by ship and historical signature owner, including snapshots without a current ship', async () => {
    const { layer, user, other } = await setup();
    const own = await service.getFields(
      layer.id,
      { ...bounds, filter: 'USER', targetId: user.id },
      now,
    );
    const ship = await service.getFields(
      layer.id,
      { ...bounds, filter: 'SPACECRAFT', targetId: 101 },
      now,
    );
    expect(ship).toEqual(own);
    expect(own[0].directions).toEqual({ NORTH: 0, EAST: 1, SOUTH: 0, WEST: 1 });
    expect(
      (
        await service.getFields(
          layer.id,
          { ...bounds, filter: 'USER', targetId: other.id },
          now,
        )
      )[0].directions,
    ).toEqual({ NORTH: 1, EAST: 1, SOUTH: 0, WEST: 0 });
    expect(
      await service.getFields(
        layer.id,
        { ...bounds, filter: 'SPACECRAFT', targetId: 999 },
        now,
      ),
    ).toEqual([]);
  });

  it('uses current alliance membership for the alliance filter', async () => {
    const { layer, user, alliance } = await setup();
    expect(
      await service.getFields(
        layer.id,
        { ...bounds, filter: 'ALLIANCE', targetId: alliance.id },
        now,
      ),
    ).toEqual(
      await service.getFields(
        layer.id,
        { ...bounds, filter: 'USER', targetId: user.id },
        now,
      ),
    );
    await source
      .getRepository('AllianceMembership')
      .delete({ userId: user.id });
    expect(
      await service.getFields(
        layer.id,
        { ...bounds, filter: 'ALLIANCE', targetId: alliance.id },
        now,
      ),
    ).toEqual([]);
  });

  it('rejects invalid windows, missing filter IDs and nonexistent layers', async () => {
    const { layer } = await setup();
    await expect(
      service.getFields(layer.id, { ...bounds, xStart: 3 }, now),
    ).rejects.toThrow('Kartenausschnitt');
    await expect(
      service.getFields(layer.id, { ...bounds, xEnd: 6 }, now),
    ).rejects.toThrow('Kartenausschnitt');
    await expect(
      service.getFields(layer.id, { ...bounds, filter: 'USER' }, now),
    ).rejects.toThrow('gültige ID');
    await expect(service.getFields(999, bounds, now)).rejects.toThrow(
      'Ebene nicht gefunden',
    );
  });
  it('counts colony-list signatures in one query exactly like the sector scan (col-AUD-02a)', async () => {
    const { user, other, origin, destination } = await setup();
    const signatures = new FlightSignatureService(
      source.getRepository('FlightSignature') as never,
      {} as never,
    );
    const locations = [origin.location.id, destination.location.id];
    for (const viewer of [user, other]) {
      const counts = await signatures.countVisibleAt(locations, viewer.id, now);
      for (const locationId of locations) {
        const scan = await signatures.getVisibleAt(locationId, viewer.id, now, true);
        expect(counts.get(locationId) ?? 0).toBe(
          scan.signatures.length + scan.fadedSignatures.uncloaked + scan.fadedSignatures.cloaked,
        );
      }
    }
    // Viewer `other` sees ship 101 on both fields; the 49 h and future rows never count.
    expect(await signatures.countVisibleAt(locations, other.id, now)).toEqual(
      new Map([[origin.location.id, 1], [destination.location.id, 1]]),
    );
  });
});
