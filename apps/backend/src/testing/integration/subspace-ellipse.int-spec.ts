import { DataSource } from 'typeorm';
import { AnomalyRegistry } from '../../modules/anomaly/anomaly-registry';
import { AnomalyService } from '../../modules/anomaly/anomaly.service';
import { SubspaceEllipseHandler } from '../../modules/anomaly/subspace-ellipse.handler';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { FlightConsequencePipeline } from '../../modules/spacecraft/flight-consequence-pipeline';
import { AnomalyFlightConsequence } from '../../modules/anomaly/anomaly-flight-consequence';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

describe('subspace ellipse in the main tick', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  it('dispatches flight entry to the anomaly handler, but an ellipse leaves entering ships untouched', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Entry', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 1 });
    const ship = await source.getRepository('Spacecraft').save({ name: 'Ship', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, shields: 50, runtimeSystems: { SHIELDS: { active: true, integrity: 70, current: 50 } } });
    const type = await source.getRepository('AnomalyType').save({ key: 'SUBSPACE_ELLIPSE' });
    await source.getRepository('Anomaly').save({ typeId: type.id, locationId: location.id, remainingTicks: 1 });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const handler = new SubspaceEllipseHandler(messaging, { integer: () => 1 });
    const incoming = jest.spyOn(handler, 'handleIncomingSpacecraft');
    const registry = new AnomalyRegistry();
    registry.register(handler);
    const pipeline = new FlightConsequencePipeline([new AnomalyFlightConsequence(source, registry)]);
    await pipeline.onEnterField(ship as never, field as never);
    expect(incoming).toHaveBeenCalledTimes(1);
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: ship.id })).toMatchObject({ shields: 50, runtimeSystems: { SHIELDS: { active: true, integrity: 70, current: 50 } } });
    expect(await source.getRepository('Message').count()).toBe(0);
  });

  it('skips the entry transaction when no anomaly is at the location', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Empty', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 1 });
    const ship = await source.getRepository('Spacecraft').save({ name: 'Ship', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, runtimeSystems: {} });
    const transaction = jest.spyOn(source, 'transaction');
    await new FlightConsequencePipeline([new AnomalyFlightConsequence(source, new AnomalyRegistry())]).onEnterField(ship as never, field as never);
    expect(transaction).not.toHaveBeenCalled();
    transaction.mockRestore();
  });

  it('fails with the class key only when an unknown class has an eligible ship', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Legacy', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'LEGACY_UNKNOWN', name: 'Legacy', category: 'SHIP', role: 'SHIP' });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => 1 }));
    const service = new AnomalyService(source, registry);
    await service.processTick(1);
    const ship = await source.getRepository('Spacecraft').save({ name: 'Legacy ship', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, status: 'UNDER_CONSTRUCTION' });
    await service.processTick(2);
    await source.getRepository('Spacecraft').update(ship.id, { status: 'IDLE' });
    await expect(service.processTick(3)).rejects.toThrow(/anomalyMass.*LEGACY_UNKNOWN/);
  });

  it('does not damage a ship that leaves while the tick waits for its row lock', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Lock', width: 2, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const fields = source.getRepository('GalaxyField');
    const first = await fields.save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const second = await fields.save({ layerId: layer.id, cx: 2, cy: 1, fieldTypeId: fieldType.id });
    const locations = source.getRepository('SpaceLocation');
    const origin = await locations.findOneByOrFail({ galaxyFieldId: first.id });
    const destination = await locations.findOneByOrFail({ galaxyFieldId: second.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 1 });
    const ship = await source.getRepository('Spacecraft').save({ name: 'Ship', userId: owner.id, shipClassId: shipClass.id, locationId: origin.id, shields: 50, runtimeSystems: { SHIELDS: { active: true, integrity: 70 } } });
    const type = await source.getRepository('AnomalyType').save({ key: 'SUBSPACE_ELLIPSE' });
    await source.getRepository('Anomaly').save({ typeId: type.id, locationId: origin.id, remainingTicks: 1 });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => 1 }));
    const runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.manager.getRepository('Spacecraft').update(ship.id, { locationId: destination.id });
    const tick = new AnomalyService(source, registry).processTick(1);
    try {
      const deadline = Date.now() + 5000;
      for (;;) {
        const [{ waiting }] = await source.query(`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock') AS waiting`);
        if (waiting) break;
        if (Date.now() >= deadline) throw new Error('tick did not wait for the ship');
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      await runner.commitTransaction();
      await tick;
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await tick.catch(() => undefined);
      await runner.release();
    }
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: ship.id })).toMatchObject({ locationId: destination.id, shields: 50, runtimeSystems: { SHIELDS: { active: true, integrity: 70 } } });
    expect(await source.getRepository('Message').count()).toBe(0);
  });

  it('damages shields on the following tick, notifies the owner, and disappears', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Ellipse', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 1 });
    const ship = await source.getRepository('Spacecraft').save({ name: 'Ship', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, shields: 50, runtimeSystems: { SHIELDS: { active: true, integrity: 70, current: 50 } } });
    const type = await source.getRepository('AnomalyType').save({ key: 'SUBSPACE_ELLIPSE' });
    await source.getRepository('Anomaly').save({ typeId: type.id, locationId: location.id, remainingTicks: 1 });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => 50 }));
    await new AnomalyService(source, registry).processTick(1);
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: ship.id })).toMatchObject({ shields: 0, runtimeSystems: { SHIELDS: { active: false, integrity: 20, current: 0 } } });
    expect(await source.getRepository('Anomaly').count()).toBe(0);
    expect(await source.getRepository('Message').find()).toMatchObject([{ recipientId: owner.id }]);
  });

  it('does not roll at the exact threshold and caps the chance at 100', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Threshold', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 33333333 });
    await source.getRepository('Spacecraft').save({ name: 'Ship', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, crew: 0, runtimeSystems: {} });
    const rolls: number[] = [];
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => { rolls.push(100); return 100; } }));
    const service = new AnomalyService(source, registry);
    await service.processTick(1);
    expect(rolls).toEqual([]);
    await source.getRepository('ShipClassDef').update(shipClass.id, { anomalyMass: 200000000 });
    await service.processTick(2);
    expect(rolls).toEqual([100]);
    expect(await source.getRepository('Anomaly').count()).toBe(1);
  });

  it('counts full ship mass, one-tenth station mass and active-system crew scores while excluding NPC, construction and hyperdrive', async () => {
    const owner = await createUser(source);
    const npc = await createUser(source, { isNpc: true });
    const layer = await source.getRepository('Layer').save({ name: 'Score', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const mobile = await source.getRepository('ShipClassDef').save({ key: 'MOBILE', name: 'Mobile', category: 'SHIP', role: 'SHIP', anomalyMass: 30000000 });
    const station = await source.getRepository('ShipClassDef').save({ key: 'STATION', name: 'Station', category: 'STATION', role: 'DEPOT', anomalyMass: 33323340 });
    const ships = source.getRepository('Spacecraft');
    await ships.save({ name: 'Mobile', userId: owner.id, shipClassId: mobile.id, locationId: location.id, crew: 10, runtimeSystems: { SHIELDS: { active: true }, COMPUTER: { active: false } } });
    await ships.save({ name: 'Station', userId: owner.id, shipClassId: station.id, locationId: location.id, kind: 'STATION', crew: 0, runtimeSystems: {} });
    await ships.save({ name: 'NPC', userId: npc.id, shipClassId: mobile.id, locationId: location.id });
    await ships.save({ name: 'Building', userId: owner.id, shipClassId: mobile.id, locationId: location.id, status: 'UNDER_CONSTRUCTION' });
    await ships.save({ name: 'Warping', userId: owner.id, shipClassId: mobile.id, locationId: location.id, runtimeSystems: { WARPDRIVE: { active: true } } });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const rolls: number[] = [];
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => { const roll = rolls.length ? 6 : 7; rolls.push(roll); return roll; } }));
    const service = new AnomalyService(source, registry);
    await service.processTick(1);
    expect(rolls).toEqual([7]);
    expect(await source.getRepository('Anomaly').count()).toBe(0);
    await service.processTick(2);
    expect(rolls).toEqual([7, 6]);
    expect(await source.getRepository('Anomaly').count()).toBe(1);
  });

  it('multiplies the location-wide crew total by the location-wide active system total', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Aggregate', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 16_664_667 });
    const ships = source.getRepository('Spacecraft');
    // Mass 33_329_334; per-ship crew scores would add 2 × 10 × 1 × 100 = 2_000, STU adds 20 × 2 × 100 = 4_000.
    await ships.save({ name: 'A', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, crew: 10, runtimeSystems: { SHIELDS: { active: true } } });
    await ships.save({ name: 'B', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, crew: 10, runtimeSystems: { SHIELDS: { active: true } } });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const rolls: number[] = [];
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => { rolls.push(6); return 6; } }));
    await new AnomalyService(source, registry).processTick(1);
    expect(rolls).toEqual([6]);
    expect(await source.getRepository('Anomaly').count()).toBe(1);
  });

  it('informs every non-NPC owner at the location on creation, including owners of non-counting ships', async () => {
    const owner = await createUser(source);
    const visitor = await createUser(source);
    const npc = await createUser(source, { isNpc: true });
    const layer = await source.getRepository('Layer').save({ name: 'Owners', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 4, cy: 7, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 100_000_000 });
    const ships = source.getRepository('Spacecraft');
    await ships.save({ name: 'Heavy', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, runtimeSystems: {} });
    await ships.save({ name: 'Warping', userId: visitor.id, shipClassId: shipClass.id, locationId: location.id, runtimeSystems: { WARPDRIVE: { active: true } } });
    await ships.save({ name: 'NPC', userId: npc.id, shipClassId: shipClass.id, locationId: location.id, runtimeSystems: {} });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => 1 }));
    await new AnomalyService(source, registry).processTick(1);
    const messages = await source.getRepository('Message').find({ order: { recipientId: 'ASC' } });
    expect(messages.map((message) => message.recipientId)).toEqual([owner.id, visitor.id].sort((a, b) => a - b));
    expect(messages[0]).toMatchObject({ folder: 'SYSTEM', body: expect.stringContaining('Sektor 4|7') });
  });

  it('skips vacationing owners, ships without shields and already discharged ships with destroyed emitters', async () => {
    const owner = await createUser(source);
    const resting = await createUser(source);
    await source.getRepository('User').update(resting.id, { vacationMode: true, vacationStartedAt: new Date(Date.now() - 49 * 60 * 60 * 1000) });
    const layer = await source.getRepository('Layer').save({ name: 'Skips', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 1 });
    const ships = source.getRepository('Spacecraft');
    const vacation = await ships.save({ name: 'Vacation', userId: resting.id, shipClassId: shipClass.id, locationId: location.id, shields: 50, runtimeSystems: { SHIELDS: { active: true, integrity: 70 } } });
    const unshielded = await ships.save({ name: 'Unshielded', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, shields: 0, runtimeSystems: { COMPUTER: { active: true, integrity: 100 } } });
    const broken = await ships.save({ name: 'Broken', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, shields: 0, runtimeSystems: { SHIELDS: { active: false, integrity: 0 } } });
    const drained = await ships.save({ name: 'Drained', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, shields: 0, runtimeSystems: { SHIELDS: { active: false, integrity: 40 } } });
    const type = await source.getRepository('AnomalyType').save({ key: 'SUBSPACE_ELLIPSE' });
    await source.getRepository('Anomaly').save({ typeId: type.id, locationId: location.id, remainingTicks: 1 });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => 10 }));
    await new AnomalyService(source, registry).processTick(1);
    expect(await ships.findOneByOrFail({ id: vacation.id })).toMatchObject({ shields: 50, runtimeSystems: { SHIELDS: { active: true, integrity: 70 } } });
    expect(await ships.findOneByOrFail({ id: unshielded.id })).toMatchObject({ runtimeSystems: { COMPUTER: { active: true, integrity: 100 } } });
    expect(await ships.findOneByOrFail({ id: broken.id })).toMatchObject({ runtimeSystems: { SHIELDS: { integrity: 0 } } });
    expect(await ships.findOneByOrFail({ id: drained.id })).toMatchObject({ shields: 0, runtimeSystems: { SHIELDS: { integrity: 30 } } });
    const messages = await source.getRepository('Message').find();
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe('Drained\n- der Schildemitter wurde um 10% beschädigt');
  });

  it('bundles one ship report and one station report per owner', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Reports', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 2, cy: 3, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 1 });
    const ships = source.getRepository('Spacecraft');
    for (const name of ['One', 'Two']) {
      await ships.save({ name, userId: owner.id, shipClassId: shipClass.id, locationId: location.id, shields: 20, runtimeSystems: { SHIELDS: { active: true, integrity: 100 } } });
    }
    await ships.save({ name: 'Base', kind: 'STATION', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, shields: 20, runtimeSystems: { SHIELDS: { active: true, integrity: 100 } } });
    const type = await source.getRepository('AnomalyType').save({ key: 'SUBSPACE_ELLIPSE' });
    await source.getRepository('Anomaly').save({ typeId: type.id, locationId: location.id, remainingTicks: 1 });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => 5 }));
    await new AnomalyService(source, registry).processTick(1);
    const messages = await source.getRepository('Message').find({ order: { folder: 'ASC' } });
    expect(messages).toMatchObject([
      { folder: 'SHIP', subject: 'Subraumellipse in Sektor 2|3', body: 'One\n- die Schilde wurden entladen\n- der Schildemitter wurde um 5% beschädigt\nTwo\n- die Schilde wurden entladen\n- der Schildemitter wurde um 5% beschädigt' },
      { folder: 'STATION', subject: 'Subraumellipse in Sektor 2|3', body: 'Base\n- die Schilde wurden entladen\n- der Schildemitter wurde um 5% beschädigt' },
    ]);
  });

  it('never emits notifications if a later creation fails and the tick rolls back', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Rollback', width: 2, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const fields = source.getRepository('GalaxyField');
    const first = await fields.save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const second = await fields.save({ layerId: layer.id, cx: 2, cy: 1, fieldTypeId: fieldType.id });
    const locations = source.getRepository('SpaceLocation');
    const origin = await locations.findOneByOrFail({ galaxyFieldId: first.id });
    const destination = await locations.findOneByOrFail({ galaxyFieldId: second.id });
    const classes = source.getRepository('ShipClassDef');
    const valid = await classes.save({ key: 'VALID', name: 'Valid', category: 'SHIP', role: 'SHIP', anomalyMass: 100000000 });
    const missing = await classes.save({ key: 'MISSING', name: 'Missing', category: 'SHIP', role: 'SHIP' });
    await source.getRepository('Spacecraft').save({ name: 'Valid', userId: owner.id, shipClassId: valid.id, locationId: origin.id, runtimeSystems: {} });
    await source.getRepository('Spacecraft').save({ name: 'Missing', userId: owner.id, shipClassId: missing.id, locationId: destination.id, runtimeSystems: {} });
    const emit = jest.fn();
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: emit } as never, {} as never);
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => 1 }));
    await expect(new AnomalyService(source, registry).processTick(1)).rejects.toThrow(/MISSING/);
    expect(emit).not.toHaveBeenCalled();
    expect(await source.getRepository('Message').count()).toBe(0);
    expect(await source.getRepository('Anomaly').count()).toBe(0);
  });

  it('does not create another ellipse at a location that already contains one', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Existing', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 100000000 });
    await source.getRepository('Spacecraft').save({ name: 'Ship', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, runtimeSystems: {} });
    const type = await source.getRepository('AnomalyType').save({ key: 'SUBSPACE_ELLIPSE' });
    await source.getRepository('Anomaly').save({ typeId: type.id, locationId: location.id, remainingTicks: 3 });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => 1 }));
    await new AnomalyService(source, registry).processTick(1);
    expect(await source.getRepository('Anomaly').count()).toBe(1);
  });

  it('does not create an ellipse on a NO_ANOMALIES field', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Protected', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id, effects: ['NO_ANOMALIES'] });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 100000000 });
    await source.getRepository('Spacecraft').save({ name: 'Ship', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, runtimeSystems: {} });
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, { emitToUser: () => undefined } as never, {} as never);
    const registry = new AnomalyRegistry();
    registry.register(new SubspaceEllipseHandler(messaging, { integer: () => 1 }));
    await new AnomalyService(source, registry).processTick(1);
    expect(await source.getRepository('Anomaly').count()).toBe(0);
  });

  it('creates an ellipse above the threshold on an inclusive chance roll and notifies its owner', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Ellipse', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'TEST_SHIP', name: 'Test', category: 'SHIP', role: 'SHIP', anomalyMass: 33333334 });
    await source.getRepository('Spacecraft').save({ name: 'Ship', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, runtimeSystems: {} });
    const gateway = { emitToUser: () => undefined };
    const messaging = new MessagingService(source.getRepository('Message') as never, source.getRepository('User') as never, {} as never, gateway as never, {} as never);
    const handler = new SubspaceEllipseHandler(messaging, { integer: () => 6 });
    const registry = new AnomalyRegistry();
    registry.register(handler);
    await new AnomalyService(source, registry).processTick(1);
    expect(await source.getRepository('Anomaly').find()).toMatchObject([{ locationId: location.id, remainingTicks: 1 }]);
    expect(await source.getRepository('Message').find()).toMatchObject([{ recipientId: owner.id }]);
  });
});
