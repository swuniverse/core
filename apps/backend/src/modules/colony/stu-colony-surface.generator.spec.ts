import {
  StuColonySurfaceGenerator,
  normalizeStuTerrainType,
} from './stu-colony-surface.generator';

describe('StuColonySurfaceGenerator', () => {
  it.each([201, 203, 205])(
    'generates deterministic 10x10 STU-like colony fields for class %i',
    (classId) => {
      const generator = new StuColonySurfaceGenerator();

      const first = generator.generate(classId, 'same-seed', 2);
      const second = generator.generate(classId, 'same-seed', 2);

      expect(first).toEqual(second);
      expect(first.width).toBe(10);
      expect(first.surfaceHeight).toBe(6);
      expect(first.fields).toHaveLength(100);
      expect(first.fields.slice(0, 20).every((f) => f.fieldType === 900)).toBe(
        true,
      );
      expect(first.fields.slice(20, 80).some((f) => f.fieldType !== 900)).toBe(
        true,
      );
      expect(first.fields.slice(80).every((f) => f.fieldType >= 801)).toBe(
        true,
      );
    },
  );

  it('keeps STU tile ids but normalizes terrain families for build rules', () => {
    expect(normalizeStuTerrainType(112)).toBe(101);
    expect(normalizeStuTerrainType(121)).toBe(601);
    expect(normalizeStuTerrainType(211)).toBe(201);
    expect(normalizeStuTerrainType(40131)).toBe(401);
    expect(normalizeStuTerrainType(70121)).toBe(701);
    expect(normalizeStuTerrainType(851)).toBe(801);
  });
});
