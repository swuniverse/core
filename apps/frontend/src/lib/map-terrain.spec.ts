import {
  isNebulaTerrain,
  nebulaEdgeMask,
  terrainAppearance,
} from './map-terrain';

describe('map terrain appearance', () => {
  it('uses actual nebula tiles for galaxy and system fields and increases density brightness', () => {
    const thin = terrainAppearance(
      { id: 120, key: 'sehr_duenner_neon_nebel_120' },
      2,
      3,
    );
    const middle = terrainAppearance({ id: 122, key: 'neon_nebel_122' }, 2, 3);
    expect(thin.image).toContain('/map/120.png');
    expect(middle.image).toContain('/map/122.png');
    expect(thin.alpha).toBeLessThan(middle.alpha);
    expect(isNebulaTerrain({ id: 100, key: 'arbitrary' })).toBe(true);
  });
  it('keeps unknown terrain hidden and uses coordinate-based space for empty fields', () => {
    expect(
      terrainAppearance({ id: 100, key: 'UNKNOWN' }, 5, 6).image,
    ).toBeNull();
    expect(terrainAppearance(undefined, 5, 6).image).toBeNull();
    expect(
      terrainAppearance({ id: 1, key: 'EMPTY_SPACE' }, 5, 6).image,
    ).toContain('/map/starmap/0706.png');
    expect(terrainAppearance({ id: 1001, key: 'STAR_SYSTEM', category: 'system' }, 5, 6).image).toContain('/map/starmap/0706.png');
    expect(
      terrainAppearance({ id: 999, key: 'ASTEROID_FIELD' }, 5, 6).image,
    ).toContain('/map/999.png');
  });
  it('feathers exposed edges while keeping the cloud interior unbroken', () => {
    const nebula = { id: 100, key: 'NEBULA' };
    expect(
      nebulaEdgeMask(nebula, {
        top: nebula,
        right: nebula,
        bottom: nebula,
        left: nebula,
      }),
    ).toBeUndefined();
    const mask = nebulaEdgeMask(nebula, {
      top: { id: 1, key: 'EMPTY_SPACE' },
      right: nebula,
      bottom: nebula,
      left: nebula,
    });
    expect(mask?.maskImage).toContain('to bottom');
    expect(mask?.maskImage).not.toContain('to left');
    expect(nebulaEdgeMask({ id: 1, key: 'EMPTY_SPACE' }, {})).toBeUndefined();
  });
});
