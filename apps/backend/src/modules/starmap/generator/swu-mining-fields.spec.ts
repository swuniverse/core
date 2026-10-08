import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SWU_PLANET_ARCHETYPES } from './swu-planet-archetypes.generator';
import { getArchetypeGeneratorBundle } from './swu-archetype-registry';

const root = path.resolve(__dirname, '../../../../../..');
const dataRoots = [
  path.join(root, 'game-data'),
  path.join(root, 'apps/backend/src/modules/game-data'),
];
const miningDataPaths = {
  categories: 'data/buildings/swu-field-build-categories.yaml',
  resources: 'data/colony-classes/swu-letter-resources.yaml',
};
const constantsPath = path.join(
  root,
  'apps/frontend/src/pages/colonies/constants.ts',
);

const dataRoot = dataRoots.find((candidate) =>
  Object.values(miningDataPaths).every((relativePath) =>
    fs.existsSync(path.join(candidate, relativePath)),
  ),
);
const miningFixturesAvailable =
  !!dataRoot && fs.existsSync(constantsPath);
const miningFixtureSkipMessage =
  'SKIPPED: SWU mining-field fixture data is unavailable; restore the game-data gitlink or provide the repository fixture data to run this coverage test.';
if (!miningFixturesAvailable) console.warn(miningFixtureSkipMessage);

 type MiningCategoryData = {
  fieldBuildCategories: Array<{ tiles: string[]; id: string }>;
};
type LetterResource = { commodityId: number; planet: number };
type LetterResourceData = {
  letterResources: Array<{ letter: string; resources: LetterResource[] }>;
};

/**
 * Erzquellen Q = Phrik + Kyber + Sondererz der Zonen-Buchstaben (swu-letter-resources.yaml).
 * Mining-Felder X/Y/Z: X = Oberflaeche direkt bergbaubar, Y = Oberflaeche geoengineerbar
 * (bewachsene/bedeckte Felsplatte), Z = Wasser-/Untergrundfeld. Regel: X+Y+Z >= Q und X >= Q/3.
 * Ausnahmen (kein passendes Tile bzw. keine Startplaneten): rein polare A-Zonen, H, Ozean, Archipel.
 */
const EXEMPT_X = (typeId: number, letter: string) =>
  ['H'].includes(letter) ||
  [2, 11].includes(typeId) ||
  ([9, 10].includes(typeId) && letter === 'A');
const EXEMPT_SUM = (letter: string) => letter === 'H';

(miningFixturesAvailable ? describe : describe.skip)(
  'SWU mining-field fixture coverage',
  () => {
    it('covers ore sources and keeps generation deterministic', () => {
      const categories = yaml.load(
        fs.readFileSync(
          path.join(dataRoot!, miningDataPaths.categories),
          'utf8',
        ),
      ) as MiningCategoryData;
      const tileCats = new Map<string, string[]>();
      for (const category of categories.fieldBuildCategories) {
        for (const tile of category.tiles) {
          tileCats.set(tile, [...(tileCats.get(tile) ?? []), category.id]);
        }
      }
      const resources = yaml.load(
        fs.readFileSync(path.join(dataRoot!, miningDataPaths.resources), 'utf8'),
      ) as LetterResourceData;
      const letter = new Map(
        resources.letterResources.map((resource) => [
          resource.letter,
          resource.resources,
        ]),
      );
      const constants = fs.readFileSync(constantsPath, 'utf8');
      const rockNames = new Set<string>(
        [
          ...constants.matchAll(
            /^\s+([A-Z]\d[0-9A-Z]{2}): '[^']*Felsplatte'/gm,
          ),
        ].map((match) => match[1]),
      );
      ['B610', 'J610', 'K610'].forEach((tile) => rockNames.add(tile));

      const quantity = (
        zoneLetter: string,
        factor = 1,
      ): Map<number, number> => {
        const quantities = new Map<number, number>();
        for (const resource of letter.get(zoneLetter) ?? []) {
          quantities.set(
            resource.commodityId,
            Math.round(resource.planet * factor),
          );
        }
        return quantities;
      };
      const hasCategory = (tile: string, category: string) =>
        (tileCats.get(tile) ?? []).includes(category);
      const diagnostics: string[] = [];
      const originalWarn = console.warn;
      let warns = 0;
      console.warn = () => {
        warns++;
      };

      try {
        for (const archetype of SWU_PLANET_ARCHETYPES) {
          const bundle = getArchetypeGeneratorBundle(
            archetype.typeId,
            archetype.variant,
          );
          if (!bundle) continue;
          for (const slot of [1, 2, 3] as const) {
            if (bundle.seedQuality[slot] === 'GAP') continue;
            const zoneLetter = bundle.getZoneLetter(
              slot,
              'rotating' as any,
              'x',
              'base',
            );
            const amounts = quantity(zoneLetter);
            if (bundle.undergroundMixin) {
              for (const [commodityId, amount] of quantity(
                bundle.undergroundMixin.letter,
                bundle.undergroundMixin.factor,
              )) {
                amounts.set(
                  commodityId,
                  (amounts.get(commodityId) ?? 0) + amount,
                );
              }
            }
            const baseCommodities = [1511, 1508, 1505];
            const specialOre =
              [...amounts.entries()]
                .filter(
                  ([commodityId]) => !baseCommodities.includes(commodityId),
                )
                .sort((left, right) => right[1] - left[1])[0]?.[1] ?? 0;
            const requiredOre =
              (amounts.get(1511) ?? 0) +
              (amounts.get(1508) ?? 0) +
              specialOre;
            const rows: number[][] = [];
            for (let i = 0; i < 30; i++) {
              const seed = `s${i}-zone${slot}`;
              const surface = bundle
                .generateColonySurface(slot, 'rotating' as any, seed, 'base')
                .flat();
              const underground = bundle
                .generateUntergrund(slot, 'rotating' as any, seed, 'base')
                .flat();
              const repeatSurface = bundle
                .generateColonySurface(slot, 'rotating' as any, seed, 'base')
                .flat();
              const repeatUnderground = bundle
                .generateUntergrund(slot, 'rotating' as any, seed, 'base')
                .flat();
              expect(repeatSurface).toEqual(surface);
              expect(repeatUnderground).toEqual(underground);

              const x = surface.filter(
                (tile) =>
                  hasCategory(tile, 'bergbau') ||
                  hasCategory(tile, 'bergbau_spezial'),
              ).length;
              const y = surface.filter(
                (tile) =>
                  rockNames.has(tile) &&
                  !hasCategory(tile, 'bergbau') &&
                  !hasCategory(tile, 'bergbau_spezial'),
              ).length;
              const z =
                surface.filter((tile) => hasCategory(tile, 'bergbau_tiefsee'))
                  .length +
                underground.filter(
                  (tile) =>
                    hasCategory(tile, 'bergbau_untergrund') ||
                    hasCategory(tile, 'bergbau_tiefsee'),
                ).length;
              rows.push([x, y, z]);
            }

            const average = (index: number) =>
              (
                rows.reduce((sum, row) => sum + row[index], 0) / rows.length
              ).toFixed(1);
            const minimum = (index: number) =>
              Math.min(...rows.map((row) => row[index]));
            const minimumTotal = Math.min(
              ...rows.map((row) => row[0] + row[1] + row[2]),
            );
            const minimumX = Math.min(...rows.map((row) => row[0]));
            const minimumRequiredX = Math.ceil(requiredOre / 3);
            if (!EXEMPT_SUM(zoneLetter)) {
              expect(minimumTotal).toBeGreaterThanOrEqual(requiredOre);
            }
            if (!EXEMPT_X(archetype.typeId, zoneLetter)) {
              expect(minimumX).toBeGreaterThanOrEqual(minimumRequiredX);
            }
            diagnostics.push(
              `${String(archetype.typeId) + (archetype.variant ?? '')} ${archetype.typeName} z${slot} [${zoneLetter}] Q=${requiredOre} | avg X/Y/Z=${average(0)}/${average(1)}/${average(2)} | min X=${minimum(0)} Y=${minimum(1)} Z=${minimum(2)} sum=${minimumTotal}`,
            );
          }
        }
      } finally {
        console.warn = originalWarn;
      }

      expect(warns).toBe(0);
      expect(diagnostics).not.toHaveLength(0);
    });
  },
);
