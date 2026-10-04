import { SWU_PLANET_ARCHETYPES } from '../starmap/generator/swu-planet-archetypes.generator';
import {
  getSwuStarterCandidateClassIds,
  getSwuStarterZones,
} from './onboarding-swu-starter.util';

describe('onboarding-swu-starter.util', () => {
  it('only offers zones with biome letter C or E', () => {
    let found = 0;
    for (const classId of getSwuStarterCandidateClassIds()) {
      const zones = getSwuStarterZones({ name: null, classId, objectType: 1 });
      for (const zone of zones) {
        expect(['C', 'E']).toContain(zone.letter);
        found += 1;
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it('never offers non-starter-eligible archetypes or STU classes', () => {
    const excluded = SWU_PLANET_ARCHETYPES.filter(
      (a) => a.starterEligible === false,
    );
    expect(excluded.length).toBeGreaterThan(0);
    expect(getSwuStarterZones({ name: null, classId: 1, objectType: 1 })).toEqual([]);
    expect(getSwuStarterZones({ name: null, classId: null, objectType: 1 })).toEqual([]);
  });
});
