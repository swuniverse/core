import { classifyZoneOres } from './swu-zone-ores';

const names: Record<number, string> = { 1511: 'Phrik', 1508: 'Kyber', 1505: 'Hypermaterie', 1513: 'Laminanium', 1514: 'Quadranium' };
const nameOf = (id: number) => names[id] ?? String(id);
// Polar-Zone (Buchstabe A) aus swu-letter-resources.yaml
const polarPlanet = new Map([[1511, 9], [1508, 4], [1505, 15], [1513, 3], [1514, 1]]);
const polarMoon = new Map([[1511, 6], [1508, 3], [1505, 9], [1513, 1]]);

describe('classifyZoneOres', () => {
  it('planet: base ores by threshold, Sondererz rich, Sekundaererz trace', () => {
    expect(classifyZoneOres(polarPlanet, false, nameOf).map((o) => [o.name, o.tier, o.sources])).toEqual([
      ['Phrik', 'rich', 9],
      ['Kyber', 'rich', 4],
      ['Hypermaterie', 'rich', 15],
      ['Laminanium', 'rich', 3],
      ['Quadranium', 'trace', 1],
    ]);
  });

  it('moon: only the Sondererz, as trace', () => {
    const ores = classifyZoneOres(polarMoon, true, nameOf);
    expect(ores.map((o) => [o.name, o.tier, o.sources])).toEqual([
      ['Phrik', 'rich', 6],
      ['Kyber', 'rich', 3],
      ['Hypermaterie', 'rich', 9],
      ['Laminanium', 'trace', 1],
    ]);
  });
});
