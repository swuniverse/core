import { AllianceRole } from '@swuniverse/shared';
import { diplomacyPartyStoreContract } from './testing/diplomacy-party-store.contract';
import {
  EMPIRE,
  InMemoryAllianceStore,
  REBELS,
} from './testing/in-memory-alliance.store';

describe('InMemoryAllianceStore party model', () => {
  diplomacyPartyStoreContract(async () => {
    const store = new InMemoryAllianceStore();
    let nextUser = 0;
    const factionOf = (faction: 'REBELS' | 'EMPIRE') =>
      faction === 'REBELS' ? REBELS.id : EMPIRE.id;
    const player = async (faction: 'REBELS' | 'EMPIRE' = 'REBELS') => {
      nextUser += 1;
      store.addPlayer(nextUser, `Player ${nextUser}`, factionOf(faction));
      return nextUser;
    };
    return {
      store,
      player,
      alliance: async (faction: 'REBELS' | 'EMPIRE' = 'REBELS') => {
        const president = await player(faction);
        return store.seedAlliance(
          {
            name: `Alliance of ${president}`,
            factionId: factionOf(faction),
          },
          [[president, AllianceRole.PRESIDENT]],
        ).id;
      },
    };
  });
});
