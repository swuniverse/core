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

  it('keeps 3-digit types as-is, strips 5-digit bonus tiles to 3-digit base', () => {
    expect(normalizeStuTerrainType(112)).toBe(112);
    expect(normalizeStuTerrainType(121)).toBe(121);
    expect(normalizeStuTerrainType(211)).toBe(211);
    expect(normalizeStuTerrainType(851)).toBe(851);
    expect(normalizeStuTerrainType(40131)).toBe(401);
    expect(normalizeStuTerrainType(70121)).toBe(701);
    expect(normalizeStuTerrainType(11101)).toBe(111);
    expect(normalizeStuTerrainType(10103)).toBe(101);
  });
});
