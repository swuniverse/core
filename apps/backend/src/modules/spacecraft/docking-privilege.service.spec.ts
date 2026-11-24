jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP', STATION: 'STATION' },
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../alliance/entities/alliance.entity', () => ({ Alliance: class Alliance {} }));
jest.mock('../alliance/entities/alliance-membership.entity', () => ({
  AllianceMembership: class AllianceMembership {},
}));
jest.mock('../faction/entities/faction.entity', () => ({
  FactionEntity: class FactionEntity {},
}));
jest.mock('../messaging/messaging.service', () => ({ MessagingService: class {} }));
jest.mock('typeorm', () => ({
  ...jest.requireActual('typeorm'),
  In: (value: number[]) => ({ _value: value }),
}));

import { AllianceContextCleanup } from '../alliance/alliance-context-cleanup';
import { DockingPrivilegeService } from './docking-privilege.service';
import {
  DockingPrivilege,
  DockingPrivilegeMode as Mode,
  DockingPrivilegeType as Type,
} from './entities/docking-privilege.entity';

type Row = Record<string, any>;

function build(rules: Row[], membershipAllianceId: number | null = 7) {
  const del = jest.fn(async () => undefined);
  const manager: any = {
    find: jest.fn(async (entity: unknown) => (entity === DockingPrivilege ? rules : [])),
    findOneBy: jest.fn(async (entity: { name: string }) => {
      if (entity.name === 'User') return { id: 2, factionId: 3 };
      if (entity.name === 'AllianceMembership') {
        return membershipAllianceId == null ? null : { allianceId: membershipAllianceId };
      }
      return null;
    }),
    findBy: jest.fn(async (entity: { name: string }) =>
      entity.name === 'User' ? [{ id: 2, username: 'Pilot' }] : [],
    ),
    delete: del,
    transaction: undefined,
  };
  const messaging = { sendSystem: jest.fn(async () => ({})) };
  const cleanup = new AllianceContextCleanup();
  const service = new DockingPrivilegeService(
    { manager, transaction: async (work: any) => work(manager) } as any,
    messaging as any,
    cleanup,
  );
  service.onModuleInit();
  return { service, manager, messaging, cleanup, del };
}

const station = { id: 100, userId: 1 };
const foreignShip = { id: 5, userId: 2 };

describe('DockingPrivilegeService', () => {
  it('lets the owner dock without any rule', async () => {
    const { service, manager } = build([]);
    await expect(service.decide(manager, station, { id: 9, userId: 1 })).resolves.toEqual({
      allowed: true,
    });
  });

  it('applies deny before allow across user, alliance, faction and ship rules', async () => {
    const rules = [
      { stationId: 100, targetType: Type.FACTION, targetId: 3, mode: Mode.ALLOW },
      { stationId: 100, targetType: Type.ALLIANCE, targetId: 7, mode: Mode.DENY },
    ];
    const { service, manager } = build(rules);
    const decision = await service.decide(manager, station, foreignShip);
    expect(decision.allowed).toBe(false);
  });

  it('allows through the current alliance membership only', async () => {
    const rules = [{ stationId: 100, targetType: Type.ALLIANCE, targetId: 7, mode: Mode.ALLOW }];
    const member = build(rules, 7);
    expect((await member.service.decide(member.manager, station, foreignShip)).allowed).toBe(true);
    const left = build(rules, null);
    expect((await left.service.decide(left.manager, station, foreignShip)).allowed).toBe(false);
  });

  it('removes rules aimed at a dissolved alliance in the event transaction', async () => {
    const { cleanup, del } = build([]);
    const transaction = { delete: del };
    await cleanup.allianceDissolved({ allianceId: 7, memberUserIds: [2] }, { transaction });
    expect(del).toHaveBeenCalledWith(DockingPrivilege, {
      targetType: Type.ALLIANCE,
      targetId: 7,
    });
  });

  it('notifies the owner of foreign docking in the station folder, honouring auto-read', async () => {
    const { service, messaging } = build([]);
    await service.notifyForeignDocking(
      { ...station, name: 'Hoth-Depot', dockPmAutoRead: true },
      [
        { id: 5, userId: 2, name: 'Falke' },
        { id: 6, userId: 1, name: 'Eigen' },
      ],
    );
    expect(messaging.sendSystem).toHaveBeenCalledTimes(1);
    const args = (messaging.sendSystem.mock.calls[0] as unknown[]);
    expect(args[0]).toBe(1);
    expect(args[1]).toContain('Falke');
    expect(args[1]).toContain('Pilot');
    expect(args[3]).toBe('STATION');
    expect(args[5]).toBe(true);
  });

  it('bulk-checks foreign stations for the nearby dock action', async () => {
    const rules = [{ stationId: 100, targetType: Type.USER, targetId: 2, mode: Mode.ALLOW }];
    const { service } = build(rules);
    const allowed = await service.allowedStationIds(foreignShip, [
      station,
      { id: 101, userId: 1 },
      { id: 102, userId: 2 },
    ]);
    expect([...allowed].sort()).toEqual([100, 102]);
  });
});
