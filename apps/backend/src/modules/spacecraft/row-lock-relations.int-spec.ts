import { HttpException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { HolonetService } from '../holonet/holonet.service';
import { SpacecraftBoardingService } from './spacecraft-boarding.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';

/**
 * PostgreSQL rejects FOR UPDATE on the nullable side of the LEFT JOINs that
 * TypeORM adds for `relations`; these paths lock only their base table.
 */
describe('row locks with loaded relations (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  const stub = () => ({
    sendSystem: jest.fn(async () => undefined),
    change: jest.fn(async () => undefined),
    enhanceSpacecraft: jest.fn(async () => undefined),
    recordSpacecraft: jest.fn(async () => undefined),
  });

  async function twoShips() {
    const owner = await createUser(source);
    const rival = await createUser(source);
    const shipClass = await source.getRepository('ShipClassDef').save({
      key: 'LOCK_TEST',
      name: 'Lock test',
      category: 'SHIP',
      role: 'ESCORT',
    });
    const layer = await source
      .getRepository('Layer')
      .save({ name: 'Lock test', width: 5, height: 5 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source
      .getRepository('GalaxyField')
      .save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source
      .getRepository('SpaceLocation')
      .findOneByOrFail({ galaxyFieldId: field.id });
    const ship = (userId: number, name: string) =>
      source.getRepository('Spacecraft').save({
        name,
        userId,
        shipClassId: shipClass.id,
        locationId: location.id,
        energy: 20,
        runtimeSystems: {},
      });
    return {
      owner,
      rival,
      attacker: await ship(owner.id, 'Attacker'),
      target: await ship(rival.id, 'Target'),
    };
  }

  const expectDomainOutcome = async (promise: Promise<unknown>) => {
    const outcome = await promise.then(
      () => null,
      (error: unknown) => error,
    );
    if (outcome !== null) expect(outcome).toBeInstanceOf(HttpException);
  };

  it('starts a takeover check without a lock error', async () => {
    const { owner, attacker, target } = await twoShips();
    const s = stub();
    const service = new SpacecraftTakeoverService(
      source,
      s as never,
      s as never,
      s as never,
      s as never,
      new SpacecraftRuntimeStateService(),
    );

    await expectDomainOutcome(service.start(attacker.id, target.id, owner.id));
  });

  it('completes a takeover tick without a lock error', async () => {
    const { owner, rival, attacker, target } = await twoShips();
    await source.getRepository('SpacecraftTakeover').save({
      attackerId: attacker.id,
      targetId: target.id,
      attackerUserId: owner.id,
      targetUserId: rival.id,
      ticksRemaining: 1,
      prestigeCost: 0,
    });
    const s = stub();
    const service = new SpacecraftTakeoverService(
      source,
      s as never,
      s as never,
      s as never,
      s as never,
      new SpacecraftRuntimeStateService(),
    );

    await expectDomainOutcome(service.processTick(attacker.id));
  });

  it('starts a boarding check without a lock error', async () => {
    const { owner, attacker, target } = await twoShips();
    const s = stub();
    const service = new SpacecraftBoardingService(
      source,
      new SpacecraftRuntimeStateService(),
      s as never,
      s as never,
      s as never,
      { integer: () => 1 },
      [],
    );

    await expectDomainOutcome(service.board(attacker.id, target.id, owner.id));
  });

  it('answers an unknown plot post request with "not found" instead of a lock error', async () => {
    const service = Object.assign(Object.create(HolonetService.prototype), {
      plotPostRequestRepo: source.getRepository('PlotPostRequest'),
    }) as HolonetService;

    await expect(service.decidePlotPostRequest(999_999, 1, true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
