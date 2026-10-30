import path from 'node:path';
import { GameDataService } from '../game-data/game-data.service';
import { buildAsteroidSurfaceSnapshot } from './colony-asteroid-surface';

process.env.GAME_DATA_PATH = path.resolve(
  process.cwd(),
  process.cwd().endsWith('apps/backend')
    ? '../../game-data/data'
    : 'game-data/data',
);

describe('asteroid colony surface', () => {
  let gameData: GameDataService;
  const snapshot = (classId: number | null, seed = 'colony-1-2') =>
    buildAsteroidSurfaceSnapshot(classId, seed, (tile) =>
      gameData.getCategoriesForTerrainTile(tile),
    );

  beforeAll(() => {
    gameData = new GameDataService();
    gameData.onModuleInit();
  });

  it('returns null for non-asteroid classes', () => {
    expect(snapshot(201)).toBeNull();
    expect(snapshot(null)).toBeNull();
  });

  it.each([701, 705, 709, 716, 718])(
    'builds a 6x6 surface for class %i; edge tiles are not buildable',
    (classId) => {
      const result = snapshot(classId);
      expect(result?.width).toBe(6);
      expect(result?.fields).toHaveLength(36);
      expect(result!.fields.some((field) => field.selectable)).toBe(true);
      for (const field of result!.fields) {
        if (/^G9[A-F][12]$/.test(field.terrainTileId)) {
          expect(field.selectable).toBe(false);
          expect(gameData.getCategoriesForTerrainTile(field.terrainTileId)).toEqual([]);
        }
      }
    },
  );

  it('treats the wreck tile G910 as a wreck, not a start field', () => {
    expect(gameData.getCategoriesForTerrainTile('G910')).toContain('wrack');
    expect(gameData.getCategoriesForTerrainTile('G910')).not.toContain('standard');
  });
});
