import {
  getSwuArchetypeForStuClassId,
  getSwuClassIdForStuClassId,
  getMappedStuClassIds,
  getSwuNameSuffixForStuClassId,
  stripSwuNameSuffix,
} from './swu-stu-class-mapping';
import { findArchetypeBySwuClassId } from './swu-archetype-registry';

describe('swu-stu-class-mapping', () => {
  it('maps every known letter to the archetype agreed in the balancing conversation', () => {
    const cases: Array<[number, string, string | null]> = [
      [201, 'Erdähnlich', null], // M planet
      [401, 'Erdähnlich', null], // M moon
      [203, 'Waldplanet', null], // L planet
      [205, 'Ozeanwelt', null], // O planet
      [211, 'Marsartig', null], // K planet
      [213, 'Wüste', null], // H planet
      [215, 'Arktisch', null], // P planet
      [216, 'Arktisch', null], // P-T planet
      [217, 'Lavaplanet', null], // X planet
      [219, 'Tundraartig', null], // G planet
      [221, 'Gasplanet', 'A'], // Q planet
      [231, 'Mondartig', null], // D planet
      // "-R" (Ring) Varianten teilen sich die Zuordnung ihrer Basisklasse
      [301, 'Erdähnlich', null],
      [331, 'Mondartig', null],
      [223, 'Giftwelt', null], // N planet
      [423, 'Giftwelt', null], // N moon
      [261, 'Gasplanet', 'B'], // I-1
      [262, 'Gasplanet', 'C'], // I-2
      [263, 'Gasplanet', 'D'], // I-3
      [361, 'Gasplanet', 'B'], // J-1
      [362, 'Gasplanet', 'C'], // J-2
      [363, 'Gasplanet', 'D'], // J-3
      [207, 'Ozeanwelt', null], // S planet (gebunden)
      [209, 'Erdähnlich', null], // T planet (gebunden)
    ];
    for (const [stuClassId, typeName, variant] of cases) {
      const swuClassId = getSwuClassIdForStuClassId(stuClassId);
      expect(swuClassId).not.toBeNull();
      const archetype = findArchetypeBySwuClassId(swuClassId!);
      expect(archetype?.typeName).toBe(typeName);
      expect(archetype?.variant).toBe(variant);
    }
  });

  it('leaves P and P-T distinguishable via getSwuArchetypeForStuClassId even though both map to Arktisch', () => {
    expect(getSwuArchetypeForStuClassId(215)).toEqual({ typeId: 10, variant: null });
    expect(getSwuArchetypeForStuClassId(216)).toEqual({ typeId: 10, variant: null });
    // beide landen auf derselben synthetischen classId - der Unterschied bleibt
    // nur ueber originalClassId (celestial_objects) erhalten, nicht hier.
    expect(getSwuClassIdForStuClassId(215)).toBe(getSwuClassIdForStuClassId(216));
  });

  it('returns null only for STU classes with no gameplay meaning at all (placeholder/unused)', () => {
    for (const unmapped of [317, 432]) {
      expect(getSwuClassIdForStuClassId(unmapped)).toBeNull();
    }
  });

  it('encodes tidal-locked rotation for S/T as a name suffix, since Erdähnlich/Ozeanwelt default to rotating', () => {
    expect(getSwuNameSuffixForStuClassId(207)).toBe(' [P2GB]'); // S -> Ozeanwelt gebunden
    expect(getSwuNameSuffixForStuClassId(209)).toBe(' [P1GB]'); // T -> Erdähnlich gebunden
    expect(getSwuNameSuffixForStuClassId(407)).toBe(' [P2GB]'); // S moon
    expect(getSwuNameSuffixForStuClassId(409)).toBe(' [P1GB]'); // T moon
  });

  it('encodes the ring body feature for J-1/2/3 as a name suffix', () => {
    expect(getSwuNameSuffixForStuClassId(361)).toBe(' [P15RR]');
    expect(getSwuNameSuffixForStuClassId(362)).toBe(' [P15RR]');
    expect(getSwuNameSuffixForStuClassId(363)).toBe(' [P15RR]');
  });

  it('needs no name suffix for classes that are already rotating+base by default', () => {
    for (const stuClassId of [201, 211, 213, 215, 217, 219, 221, 223, 231, 261]) {
      expect(getSwuNameSuffixForStuClassId(stuClassId)).toBeNull();
    }
  });

  it('appends and strips the name suffix without touching the real planet name', () => {
    const suffix = getSwuNameSuffixForStuClassId(209)!;
    const converted = `Coruscant${suffix}`;
    expect(converted).toBe('Coruscant [P1GB]');
    expect(stripSwuNameSuffix(converted)).toBe('Coruscant');
    // idempotent - ein Name ohne Suffix bleibt unveraendert
    expect(stripSwuNameSuffix('Coruscant')).toBe('Coruscant');
    expect(stripSwuNameSuffix(null)).toBeNull();
  });

  it('getMappedStuClassIds matches exactly the classIds the converter would touch', () => {
    const ids = getMappedStuClassIds();
    expect(ids).toContain(201);
    expect(ids).toContain(431);
    expect(ids).toContain(207);
    expect(ids).not.toContain(317);
    expect(ids).not.toContain(432);
    for (const id of ids) {
      expect(getSwuClassIdForStuClassId(id)).not.toBeNull();
    }
  });
});
