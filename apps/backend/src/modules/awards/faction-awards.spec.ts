import { Faction } from '@swuniverse/shared';
import { awardOrderMessage, factionAwardKey, layerNavigatorAwardKey } from './faction-awards';

describe('faction awards', () => {
  it('resolves the key of the player faction', () => {
    expect(factionAwardKey('SCOUT_REBEL', Faction.GALACTIC_EMPIRE)).toBe('SCOUT_EMPIRE');
    expect(factionAwardKey('SCOUT_EMPIRE', Faction.REBEL_ALLIANCE)).toBe('SCOUT_REBEL');
    expect(factionAwardKey(layerNavigatorAwardKey(3, 'REBEL'), Faction.GALACTIC_EMPIRE)).toBe(
      'NAVIGATOR_EMPIRE_L3',
    );
    expect(factionAwardKey('LOTTERY_WINNER', Faction.GALACTIC_EMPIRE)).toBe('LOTTERY_WINNER');
  });

  it('finds the order 66 text for both factions and per-layer keys', () => {
    expect(awardOrderMessage('RPG_GOLD_EMPIRE')).toContain('Ehre');
    expect(awardOrderMessage('NAVIGATOR_REBEL_L12')).toContain('Navigations Droiden');
    expect(awardOrderMessage('BOUNTY_HUNTER_CAUGHT_REBEL')).toBeNull();
  });
});
