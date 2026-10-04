import { SWU_PLANET_ARCHETYPES } from './swu-planet-archetypes.generator';
import { foundSwuColony, getColonizationProposals } from './swu-archetype-registry';
import { SWU_GAS_PLATFORM_CODES } from './swu-biome-letters';

describe('Gasplaneten (wie STU Klasse Q)', () => {
  const gas = SWU_PLANET_ARCHETYPES.filter((a) => a.typeId === 15);

  it.each(gas.map((a) => [a.variant, a] as const))(
    'Variante %s ist kolonisierbar mit genau einem Plattformfeld',
    (_variant, archetype) => {
      expect(archetype.landable).toBe(true);
      const proposals = getColonizationProposals(archetype, 'rotating');
      const zones = proposals.filter((p) => p.colonizable);
      expect(zones.length).toBeGreaterThan(0);
      for (const zone of zones) {
        for (const feature of ['base', 'moon', 'ring'] as const) {
          const founded = foundSwuColony(archetype, 'rotating', feature, zone.zoneSlot, 'seed');
          const platforms = founded.surface
            .flat()
            .filter((code) => SWU_GAS_PLATFORM_CODES.includes(code));
          expect(platforms).toHaveLength(1);
        }
      }
    },
  );
});
