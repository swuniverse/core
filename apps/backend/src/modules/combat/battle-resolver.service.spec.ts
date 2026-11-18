jest.mock('../spacecraft/spacecraft-torpedo.service', () => ({
  SpacecraftTorpedoService: class SpacecraftTorpedoService {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftOperatingMode: { NORMAL: 'NORMAL', STANDBY: 'STANDBY' },
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftStatus: {
    IDLE: 'IDLE',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
}));
jest.mock('../spacecraft/entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('../spacecraft/spacecraft-crew.service', () => ({
  SpacecraftCrewService: class SpacecraftCrewService {},
}));
jest.mock('../spacecraft/spacecraft-destruction.service', () => ({
  SpacecraftDestructionService: class SpacecraftDestructionService {},
}));
import { WsEventType } from '@swuniverse/shared';
import { CombatCause } from './combat-cause';
import { BattleResolverService } from './battle-resolver.service';
import {
  COMBATS_EVENT,
  DESTROYED_SHIPS_EVENT,
} from '../statistics/statistic-events';

const ship = (id: number, userId: number): any => ({
  id,
  userId,
  location: { kind: 'SYSTEM_FIELD', systemField: {} },
});

function createResolver(destroyedShipIds: number[]) {
  const modules = [{ spacecraftId: 1 }, { spacecraftId: 3 }];
  const moduleRepo = {
    find: jest.fn(async () => modules),
    save: jest.fn(async (value) => value),
  };
  const engine = {
    resolveBattle: jest.fn(async () => ({
      rounds: [],
      winner: 'draw',
      destroyedShipIds,
      attackerShipIds: [1],
      defenderShipIds: [2, 3],
    })),
  };
  const gateway = { emitToUser: jest.fn() };
  const destructionService = {
    destroyFromCombat: jest.fn(async () => undefined),
    saveCombatSurvivor: jest.fn(async () => true),
  };
  const reportFormatter = { formatBattle: jest.fn(() => ({ report: true })) };
  const statistics = { countEvent: jest.fn(async () => undefined) };
  const preparation = { prepare: jest.fn(async () => [] as any[]) };
  const resolver = new BattleResolverService(
    moduleRepo as any,
    engine as any,
    gateway as any,
    destructionService as any,
    reportFormatter as any,
    statistics as any,
    preparation as any,
  );
  return {
    resolver,
    preparation,
    moduleRepo,
    engine,
    gateway,
    destructionService,
    reportFormatter,
    statistics,
    modules,
  };
}

describe('BattleResolverService', () => {
  it('finishes preparation before the engine and prepends readiness failures to the report', async () => {
    const t = createResolver([]);
    const log = {
      action: 'PREPARATION',
      source: 'defender',
      sourceId: 2,
      detail: 'Schilde konnten nicht aktiviert werden: Nicht genügend EPS',
    };
    t.preparation.prepare.mockResolvedValue([log]);
    await t.resolver.resolve({
      attackers: [ship(1, 10)],
      defenders: [ship(2, 20)],
      initiatorShipId: 1,
      targetShipId: 2,
      attackerUserId: 10,
      defenderUserId: 20,
    });
    expect(t.preparation.prepare.mock.invocationCallOrder[0]).toBeLessThan(
      t.engine.resolveBattle.mock.invocationCallOrder[0],
    );
    expect(t.reportFormatter.formatBattle).toHaveBeenCalledWith(
      expect.objectContaining({ rounds: [{ round: 1, log: [log] }] }),
      expect.anything(),
      expect.anything(),
    );
  });
  it('passes one-way causes and per-ship energy targeting modes through to the engine', async () => {
    const t = createResolver([]);
    await t.resolver.resolve({
      attackers: [ship(1, 10)],
      defenders: [ship(2, 20)],
      initiatorShipId: 1,
      targetShipId: 2,
      attackerUserId: 10,
      defenderUserId: 20,
      cause: CombatCause.ACTIVATE_TRACTOR,
      energyFiringModes: { 1: 'RANDOM' },
    });
    expect(t.engine.resolveBattle).toHaveBeenCalledWith(
      [expect.objectContaining({ energyFiringMode: 'RANDOM' })],
      [expect.objectContaining({ ship: expect.objectContaining({ id: 2 }) })],
      CombatCause.ACTIVATE_TRACTOR,
    );
  });
  it('resolves preassembled parties without any actor or ownership check', async () => {
    const t = createResolver([1, 3]);
    const attackers = [ship(1, 10)];
    const defenders = [ship(2, 20), ship(3, 30)];

    const report = await t.resolver.resolve({
      attackers,
      defenders,
      initiatorShipId: 1,
      targetShipId: 2,
      attackerUserId: 10,
      defenderUserId: 20,
    });

    expect(report).toEqual({ report: true });
    expect(t.engine.resolveBattle).toHaveBeenCalledWith(
      [expect.objectContaining({ ship: attackers[0] })],
      [
        expect.objectContaining({ ship: defenders[0] }),
        expect.objectContaining({ ship: defenders[1] }),
      ],
      CombatCause.SHIP_FIGHT,
    );
    for (const owner of [10, 20, 30]) {
      expect(t.gateway.emitToUser).toHaveBeenCalledWith(
        owner,
        WsEventType.COMBAT_STARTED,
        { attackerId: 1, defenderId: 2 },
      );
    }
    expect(t.destructionService.destroyFromCombat).toHaveBeenCalledWith(1, 20);
    expect(t.destructionService.destroyFromCombat).toHaveBeenCalledWith(3, 10);
    expect(t.destructionService.saveCombatSurvivor).toHaveBeenCalledWith(
      defenders[0],
    );
    expect(defenders[0].lastCombatReport).toEqual(report);
    expect(attackers[0].lastCombatReport).toBeUndefined();
    expect(t.moduleRepo.save).toHaveBeenCalledWith(t.modules);
    expect(t.statistics.countEvent).toHaveBeenCalledWith(COMBATS_EVENT);
    expect(t.statistics.countEvent).toHaveBeenCalledWith(
      DESTROYED_SHIPS_EVENT,
      2,
    );
    expect(t.reportFormatter.formatBattle).toHaveBeenCalledWith(
      expect.anything(),
      attackers,
      defenders,
    );
  });
});
