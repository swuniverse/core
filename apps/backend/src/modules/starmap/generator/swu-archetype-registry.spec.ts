import { SWU_PLANET_ARCHETYPES } from './swu-planet-archetypes.generator';
import {
  findArchetypeBySwuClassId,
  getColonizationProposals,
} from './swu-archetype-registry';
import { buildSwuTestClassId } from './swu-system-generator';

describe('swu-archetype-registry', () => {
  it('decodes every synthetic classId back to its archetype', () => {
    for (const archetype of SWU_PLANET_ARCHETYPES) {
      const classId = buildSwuTestClassId(archetype.typeId, archetype.variant);
      expect(findArchetypeBySwuClassId(classId)).toBe(archetype);
    }
  });

  it('returns null for STU classIds', () => {
    expect(findArchetypeBySwuClassId(201)).toBeNull();
    expect(findArchetypeBySwuClassId(9001)).toBeNull();
  });

  it('offers three zone proposals per archetype', () => {
    for (const archetype of SWU_PLANET_ARCHETYPES) {
      const proposals = getColonizationProposals(archetype, 'rotating');
      expect(proposals).toHaveLength(3);
      expect(proposals.map((p) => p.zoneSlot)).toEqual([1, 2, 3]);
    }
  });
});
