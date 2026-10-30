jest.mock('../spacecraft/spacecraft-torpedo.service', () => ({
  SpacecraftTorpedoService: class SpacecraftTorpedoService {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftOperatingMode: { NORMAL: 'NORMAL', STANDBY: 'STANDBY' },
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftStatus: {
    IDLE: 'IDLE',
    IN_FLIGHT: 'IN_FLIGHT',
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
  const resolver = new BattleResolverService(
    moduleRepo as any,
    engine as any,
    gateway as any,
    destructionService as any,
    reportFormatter as any,
    statistics as any,
  );
  return {
    resolver,
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
