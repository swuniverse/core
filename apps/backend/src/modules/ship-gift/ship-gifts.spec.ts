import { GameDataService } from '../game-data/game-data.service';
import { SHIP_GIFTS } from './ship-gifts';

describe('SHIP_GIFTS', () => {
  const gameData = new GameDataService();
  gameData.onModuleInit();

  it('points at existing crewless hangar ships', () => {
    for (const gift of SHIP_GIFTS.filter((g) => !g.moduleCommodityIds)) {
      expect(gameData.getShipClassDefByKey(gift.shipClassKey)).toMatchObject({
        crewMin: 0,
        crewMax: 0,
      });
      expect(gameData.getHangarShipDef(gift.shipClassKey)).toBeDefined();
    }
  });

  it('outfits the Kyber scouts with an Astrometrie-Labor', () => {
    const scouts = SHIP_GIFTS.filter((g) => g.moduleCommodityIds);
    expect(scouts.map((g) => g.shipClassKey).sort()).toEqual([
      'EMPIRE_CORVETTE_LISTENER',
      'REBEL_CORVETTE_BRAHATOK',
    ]);
    for (const gift of scouts) {
      expect(gameData.getShipClassDefByKey(gift.shipClassKey)).toMatchObject({
        category: 'CORVETTE',
        role: 'SCOUT',
      });
      const moduleTypes = gift.moduleCommodityIds!.map(
        (id) => gameData.getFabricationItemByOutputCommodity(id)?.moduleType,
      );
      expect(moduleTypes).not.toContain(undefined);
      expect(moduleTypes).toContain('Astrometrie-Labor');
      if (gift.trigger.type !== 'RESEARCH') throw new Error('research gift');
      for (const techId of gift.trigger.techIds) {
        expect(gameData.getTech(techId)?.name).toBe('Kyber-Kristallmine');
      }
    }
  });

  it('triggers on landing platform research of both factions', () => {
    for (const gift of SHIP_GIFTS.filter((g) => !g.moduleCommodityIds)) {
      if (gift.trigger.type !== 'RESEARCH') continue;
      for (const techId of gift.trigger.techIds) {
        expect(gameData.getTech(techId)?.name).toBe('Landeplattform');
      }
    }
  });
});
