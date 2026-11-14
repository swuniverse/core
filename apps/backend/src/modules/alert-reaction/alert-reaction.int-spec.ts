import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { Type } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ContactMode, Faction, type CombatReportDto } from '@swuniverse/shared';
import { INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import { TypeOrmAllianceStore } from '../alliance/typeorm-alliance.store';
import { User } from '../auth/user.entity';
import { ContactService } from '../contacts/contact.service';
import { ContactStatusAdapter } from '../contacts/contact-status.adapter';
import { Contact } from '../contacts/entities/contact.entity';
import type { BattleResolutionInput, BattleResolverService } from '../combat/battle-resolver.service';
import { FactionEntity } from '../faction/entities/faction.entity';
import { GameDataService } from '../game-data/game-data.service';
import { MessagingService } from '../messaging/messaging.service';
import { StatisticsService } from '../statistics/statistics.service';
import { ExplorationService } from '../starmap/exploration.service';
import { LayerKnowledgeService } from '../starmap/layer-knowledge.service';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { CartographyPlanService } from '../spacecraft/cartography-plan.service';
import { FlightSignature } from '../spacecraft/entities/flight-signature.entity';
import { Fleet } from '../spacecraft/entities/fleet.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { AlertState, Spacecraft, SpacecraftStatus } from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { FieldTransitionExecutor } from '../spacecraft/field-transition-executor';
import { FlightConsequencePipeline } from '../spacecraft/flight-consequence-pipeline';
import { FlightSignatureService } from '../spacecraft/flight-signature.service';
import { MOVEMENT_REACTIONS, type MovementReaction } from '../spacecraft/movement-reaction.port';
import { ShipClassService } from '../spacecraft/ship-class.service';
import { SpacecraftCrewService } from '../spacecraft/spacecraft-crew.service';
import { SpacecraftDestructionService } from '../spacecraft/spacecraft-destruction.service';
import { SpacecraftRepairService } from '../spacecraft/spacecraft-repair.service';
import { SpacecraftRuntimeStateService } from '../spacecraft/spacecraft-runtime-state.service';
import { SpacecraftTakeoverService } from '../spacecraft/spacecraft-takeover.service';
import { SpacecraftService } from '../spacecraft/spacecraft.service';
import { GameGateway } from '../websocket/game.gateway';
import { AlertReactionService } from './alert-reaction.service';

/**
 * Real flights, real relationship resolver (alliances and personal contacts)
 * and Postgres. The battle itself is random and covered by the combat
 * module; here a deterministic stand-in records the parties and destroys
 * chosen ships.
 */
async function flightWithAlerts(dataSource: DataSource) {
  const realServices = [
    SpacecraftService,
    SpacecraftCrewService,
    SpacecraftTakeoverService,
    SpacecraftDestructionService,
    SpacecraftRepairService,
    CartographyPlanService,
    SpacecraftRuntimeStateService,
    FieldTransitionExecutor,
    FlightConsequencePipeline,
    ExplorationService,
    LayerKnowledgeService,
  ];
  const dependencies: Type<unknown>[] = realServices.flatMap(
    (service) => Reflect.getMetadata('design:paramtypes', service) ?? [],
  );
  const gameData = new GameDataService();
  const classes = new ShipClassService(
    dataSource.getRepository(ShipClassDef),
    dataSource.getRepository(FactionEntity),
    gameData,
  );
  const reactions: MovementReaction[] = [];
  const module = await Test.createTestingModule({
    providers: [
      ...dependencies.map((provide) => ({ provide, useValue: {} })),
      { provide: MOVEMENT_REACTIONS, useValue: reactions },
      ...INTEGRATION_ENTITIES.map((entity) => ({
        provide: getRepositoryToken(entity),
        useValue: dataSource.getRepository(entity),
      })),
      { provide: 'BuoyRepository', useValue: {} },
      { provide: 'CrewSkillRepository', useValue: {} },
      ...realServices,
      { provide: DataSource, useValue: dataSource },
      { provide: GameDataService, useValue: gameData },
      { provide: ShipClassService, useValue: classes },
      { provide: GameGateway, useValue: { emitToUser: jest.fn(), emitToAll: jest.fn() } },
      { provide: MessagingService, useValue: { sendSystem: jest.fn(async () => undefined) } },
      {
        provide: FlightSignatureService,
        useValue: new FlightSignatureService(dataSource.getRepository(FlightSignature), classes),
      },
      { provide: StatisticsService, useValue: new StatisticsService(dataSource, []) },
    ],
  }).compile();

  const battles: BattleResolutionInput[] = [];
  let destroy: number[] = [];
  const battleResolver = {
    resolve: async (input: BattleResolutionInput): Promise<CombatReportDto> => {
      battles.push(input);
      for (const id of destroy) {
        await dataSource.getRepository(Spacecraft).update(id, { status: SpacecraftStatus.DESTROYED });
      }
      return {
        parties: {
          attacker: input.attackers.map(({ id, name }) => ({ id, name, destroyed: destroy.includes(id) })),
          defender: input.defenders.map(({ id, name }) => ({ id, name, destroyed: destroy.includes(id) })),
        },
        rounds: [{ number: 1, lines: [{ kind: 'ENERGY_HIT', text: 'Alarmfeuer', emphasis: 'warning' }] }],
        outcome: { winner: 'ATTACKER', destroyedShipIds: destroy },
      };
    },
  };
  const relationships = new RelationshipResolverService(
    new TypeOrmAllianceStore(dataSource),
    new ContactStatusAdapter(
      new ContactService(
        dataSource.getRepository(Contact),
        dataSource.getRepository(User),
        {} as MessagingService,
      ),
    ),
  );
  new AlertReactionService(
    reactions,
    dataSource.getRepository(Spacecraft),
    dataSource.getRepository(Fleet),
    relationships,
    battleResolver as unknown as BattleResolverService,
  ).onModuleInit();

  return {
    service: module.get(SpacecraftService),
    battles,
    destroyOnBattle: (ids: number[]) => {
      destroy = ids;
    },
    close: () => module.close(),
  };
}

describe('alert reactions during flight (PostgreSQL)', () => {
  let dataSource: DataSource;
  let fixture: Awaited<ReturnType<typeof flightWithAlerts>>;
  let rebels: number;
  let empire: number;
  let pilot: User;
  let shipClassId: number;
  let galaxy: SpaceLocation[];

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    fixture = await flightWithAlerts(dataSource);
  });
  afterAll(async () => {
    await fixture?.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    fixture.battles.length = 0;
    fixture.destroyOnBattle([]);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    empire = await factionId(dataSource, Faction.GALACTIC_EMPIRE);
    pilot = await createUser(dataSource, { faction: Faction.REBEL_ALLIANCE, factionId: rebels });
    shipClassId = (
      await dataSource.getRepository(ShipClassDef).save({
        key: 'ALERT_TEST',
        name: 'Alert test ship',
        category: 'SHIP',
        role: 'SCOUT',
      })
    ).id;
    const layer = await dataSource.getRepository(Layer).save({ name: 'Alert layer', width: 5, height: 5 });
    galaxy = [];
    for (const cx of [1, 2, 3]) {
      const field = await dataSource
        .getRepository(GalaxyField)
        .save({ layerId: layer.id, cx, cy: 1, fieldTypeId: 1 });
      galaxy.push(await dataSource.getRepository(SpaceLocation).findOneByOrFail({ galaxyFieldId: field.id }));
    }
  });

  async function flyingShip(locationId: number, drive: 'HYPERDRIVE' | 'SUBLIGHT_DRIVE', fleetId?: number) {
    const ship = await dataSource.getRepository(Spacecraft).save({
      name: 'X-Wing',
      userId: pilot.id,
      shipClassId,
      locationId,
      energy: 50,
      fleetId: fleetId ?? null,
      runtimeSystems: {},
    });
    await dataSource.getRepository(SpacecraftModule).save([
      { spacecraftId: ship.id, category: drive, moduleType: drive, isActive: true },
      { spacecraftId: ship.id, category: 'SENSORS', moduleType: 'Sensors', isActive: true },
    ]);
    return ship;
  }

  async function alertedShip(owner: User, locationId: number, alertState: AlertState) {
    return dataSource.getRepository(Spacecraft).save({
      name: `Wache von ${owner.username}`,
      userId: owner.id,
      shipClassId,
      locationId,
      energy: 50,
      alertState,
      runtimeSystems: {},
    });
  }

  const rebel = () => createUser(dataSource, { faction: Faction.REBEL_ALLIANCE, factionId: rebels });

  it('stops a galaxy flight on the intermediate field when a personal enemy of the same faction is on yellow alert', async () => {
    const ship = await flyingShip(galaxy[0].id, 'HYPERDRIVE');
    const rival = await rebel();
    await dataSource.getRepository(Contact).save({
      userId: rival.id,
      contactUserId: pilot.id,
      mode: ContactMode.ENEMY,
    });
    const guard = await alertedShip(rival, galaxy[1].id, AlertState.YELLOW);

    const { movement } = await fixture.service.flyGalaxy(ship.id, pilot.id, 3, 1);

    expect(movement).toMatchObject({
      plannedSteps: 2,
      completedSteps: 1,
      stopReason: 'ALERT_COMBAT',
      movedShipIds: [ship.id],
      combatReport: { parties: { attacker: [{ id: guard.id }], defender: [{ id: ship.id }] } },
    });
    expect(fixture.battles).toHaveLength(1);
    expect(fixture.battles[0]).toMatchObject({
      initiatorShipId: guard.id,
      attackerUserId: rival.id,
      defenderUserId: pilot.id,
    });
    expect(await dataSource.getRepository(Spacecraft).findOneByOrFail({ id: ship.id })).toMatchObject({
      locationId: galaxy[1].id,
      energy: 49,
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(2);
  });

  it('lets a yellow alert of a neutral player of the same faction pass', async () => {
    const ship = await flyingShip(galaxy[0].id, 'HYPERDRIVE');
    await alertedShip(await rebel(), galaxy[1].id, AlertState.YELLOW);

    const { movement } = await fixture.service.flyGalaxy(ship.id, pilot.id, 3, 1);

    expect(movement).toMatchObject({ completedSteps: 2, stopReason: 'ARRIVED', combatReport: null });
    expect(fixture.battles).toHaveLength(0);
  });

  it('stops a system flight on the intermediate field at a red alert of the other faction', async () => {
    const layer = await dataSource.getRepository(Layer).findOneByOrFail({ name: 'Alert layer' });
    const system = await dataSource.getRepository(StarSystem).save({
      name: 'Alert system',
      layerId: layer.id,
      cx: 4,
      cy: 4,
      maxX: 3,
      maxY: 1,
      systemTypeId: 1,
    });
    const fields = await dataSource
      .getRepository(SystemField)
      .save([1, 2, 3].map((sx) => ({ starSystemId: system.id, sx, sy: 1, fieldTypeId: 1 })));
    const locations = await Promise.all(
      fields.map((field) => dataSource.getRepository(SpaceLocation).findOneByOrFail({ systemFieldId: field.id })),
    );
    const ship = await flyingShip(locations[0].id, 'SUBLIGHT_DRIVE');
    const imperial = await createUser(dataSource, { faction: Faction.GALACTIC_EMPIRE, factionId: empire });
    await alertedShip(imperial, locations[1].id, AlertState.RED);

    const { movement } = await fixture.service.navigate(ship.id, pilot.id, 3, 1);

    expect(movement).toMatchObject({ completedSteps: 1, stopReason: 'ALERT_COMBAT' });
    expect(movement.combatReport?.rounds[0].lines[0].text).toBe('Alarmfeuer');
    expect(await dataSource.getRepository(Spacecraft).findOneByOrFail({ id: ship.id })).toMatchObject({
      locationId: locations[1].id,
    });
  });

  it('reports fleet losses and keeps the surviving leader on the reached field', async () => {
    const fleet = await dataSource.getRepository(Fleet).save({ name: 'Rot-Staffel', userId: pilot.id, leaderId: 0 });
    const leader = await flyingShip(galaxy[0].id, 'HYPERDRIVE', fleet.id);
    const wingman = await flyingShip(galaxy[0].id, 'HYPERDRIVE', fleet.id);
    await dataSource.getRepository(Fleet).update(fleet.id, { leaderId: leader.id });
    const imperial = await createUser(dataSource, { faction: Faction.GALACTIC_EMPIRE, factionId: empire });
    await alertedShip(imperial, galaxy[1].id, AlertState.RED);
    fixture.destroyOnBattle([wingman.id]);

    const { movement } = await fixture.service.flyGalaxy(leader.id, pilot.id, 3, 1);

    expect(movement).toMatchObject({
      completedSteps: 1,
      stopReason: 'ALERT_COMBAT',
      movedShipIds: [leader.id],
      destroyedShipIds: [wingman.id],
    });
    expect(fixture.battles[0].defenders.map((ship) => ship.id)).toEqual([leader.id, wingman.id]);
    const rows = await dataSource
      .getRepository(Spacecraft)
      .find({ where: { userId: pilot.id }, order: { id: 'ASC' } });
    expect(rows.map((row) => [row.id, row.locationId, row.status])).toEqual([
      [leader.id, galaxy[1].id, SpacecraftStatus.IDLE],
      [wingman.id, galaxy[1].id, SpacecraftStatus.DESTROYED],
    ]);
  });
});
