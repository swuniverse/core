import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getSwuPlanetAssetFileName,
  SWU_PLANET_ASSET_CODE,
} from './swu-planet-assets.js';

describe('getSwuPlanetAssetFileName', () => {
  it('liefert die Standardvariante (rotierend, Planet, ohne Ring/Schild)', () => {
    expect(getSwuPlanetAssetFileName({ classId: 90010 })).toBe(
      'SWU_TE_RP00.png',
    );
  });

  it('liest Tidal Locked und Ring aus dem Namens-Code', () => {
    expect(
      getSwuPlanetAssetFileName({ classId: 90010, name: 'X [P1GR]' }),
    ).toBe('SWU_TE_TPR0.png');
  });

  it('ignoriert Tidal Locked bei Typen ohne Tidal-Grafik', () => {
    expect(
      getSwuPlanetAssetFileName({ classId: 90030, name: 'X [P3GB]' }),
    ).toBe('SWU_WA_RP00.png');
  });

  it('erkennt Monde per objectType und kennt keine Ringmonde', () => {
    expect(
      getSwuPlanetAssetFileName({
        classId: 90150,
        name: 'X [P15RR]',
        objectType: 2,
      }),
    ).toBe('SWU_G1_RM00.png');
  });

  it('setzt das Schild-Kennzeichen', () => {
    expect(
      getSwuPlanetAssetFileName({ classId: 90060, shielded: true }),
    ).toBe('SWU_DE_RP0S.png');
  });

  it('gibt null fuer STU-classIds zurueck', () => {
    expect(getSwuPlanetAssetFileName({ classId: 201 })).toBeNull();
  });

  it('jede erzeugbare Variante existiert als Datei in assets/SWU_PLANETS', () => {
    const dir = resolve(__dirname, '../../../../../assets/SWU_PLANETS');
    if (!existsSync(dir)) return; // Assets-Submodul nicht ausgecheckt
    const missing: string[] = [];
    for (const classId of Object.keys(SWU_PLANET_ASSET_CODE).map(Number)) {
      for (const name of ['', ' [P1GB]', ' [P1GR]', ' [P1RR]']) {
        for (const objectType of [1, 2]) {
          for (const shielded of [false, true]) {
            const file = getSwuPlanetAssetFileName({
              classId,
              name,
              objectType,
              shielded,
            });
            if (file && !existsSync(resolve(dir, file))) missing.push(file);
          }
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
