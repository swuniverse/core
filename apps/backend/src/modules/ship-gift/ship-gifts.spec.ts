import { GameDataService } from '../game-data/game-data.service';
import { SHIP_GIFTS } from './ship-gifts';

describe('SHIP_GIFTS', () => {
  const gameData = new GameDataService();
  gameData.onModuleInit();

  it('points at existing crewless hangar ships', () => {
    for (const gift of SHIP_GIFTS) {
      expect(gameData.getShipClassDefByKey(gift.shipClassKey)).toMatchObject({
        crewMin: 0,
        crewMax: 0,
      });
      expect(gameData.getHangarShipDef(gift.shipClassKey)).toBeDefined();
    }
  });

  it('triggers on landing platform research of both factions', () => {
    for (const gift of SHIP_GIFTS) {
      if (gift.trigger.type !== 'RESEARCH') continue;
      for (const techId of gift.trigger.techIds) {
        expect(gameData.getTech(techId)?.name).toBe('Landeplattform');
      }
    }
  });
});
