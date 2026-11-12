import { TradePostPresencePolicy } from './trade-post-presence.policy';

const IN_FLIGHT = 'IN_FLIGHT';
const IDLE = 'IDLE';

describe('TradePostPresencePolicy', () => {
  const policy = new TradePostPresencePolicy();
  const post = { locationId: 12 };
  const ship = {
    userId: 7,
    locationId: 12,
    status: IDLE,
    runtimeSystems: {},
  };

  it('accepts an owned ship at the same SpaceLocation without docking', () => {
    expect(policy.isAt({ ...ship, dockedAtId: null }, post, 7)).toBe(true);
  });

  it.each<[Parameters<TradePostPresencePolicy['isAt']>[0], string]>([
    [{ ...ship, userId: 8 }, 'foreign ship'],
    [{ ...ship, locationId: 13 }, 'different location'],
    [{ ...ship, status: IN_FLIGHT }, 'ship in flight'],
    [
      { ...ship, runtimeSystems: { WARPDRIVE: { active: true, cooldown: 0, integrity: 100 } } },
      'ship in hyperspace',
    ],
    [{ ...ship, runtimeSystems: { CLOAK: { active: true, cooldown: 0, integrity: 100 } } }, 'cloaked ship'],
  ])('rejects a %s', (candidate) => {
    expect(policy.isAt(candidate, post, 7)).toBe(false);
  });

  it.each<[Parameters<TradePostPresencePolicy['reason']>[0], string]>([
    [{ ...ship, userId: 8 }, 'Das Schiff gehört nicht dir'],
    [{ ...ship, locationId: 13 }, 'Das Schiff befindet sich nicht am Handelsposten'],
    [{ ...ship, status: IN_FLIGHT }, 'Das Schiff befindet sich im Flug'],
    [
      { ...ship, runtimeSystems: { WARPDRIVE: { active: true, cooldown: 0, integrity: 100 } } },
      'Der Hyperantrieb ist aktiv',
    ],
    [{ ...ship, runtimeSystems: { CLOAK: { active: true, cooldown: 0, integrity: 100 } } }, 'Die Tarnung ist aktiv'],
  ])('explains the rejection of %#', (candidate, reason) => {
    expect(policy.reason(candidate, post, 7)).toBe(reason);
    expect(policy.reason(ship, post, 7)).toBeNull();
  });
});
