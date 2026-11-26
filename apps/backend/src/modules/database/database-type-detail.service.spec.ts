import { NotFoundException } from '@nestjs/common';
import { SWU_PLANET_ARCHETYPES } from '../starmap/generator/swu-planet-archetypes.generator';
import { buildSwuTestClassId } from '../starmap/generator/swu-system-generator';
import { SYSTEM_TYPE_DEFINITIONS } from '../starmap/starmap-system-types';
import { DatabaseTypeDetailService } from './database-type-detail.service';

const archetype = SWU_PLANET_ARCHETYPES[0];
const planetKey = `${buildSwuTestClassId(archetype.typeId, archetype.variant)}:RB`;

function service(discovered: boolean) {
  const repo = { exists: jest.fn(async () => discovered) };
  return { repo, service: new DatabaseTypeDetailService(repo as never, repo as never) };
}

describe('DatabaseTypeDetailService', () => {
  it('returns a discovered planet type with example surfaces per landing zone', async () => {
    const { service: detail, repo } = service(true);
    const result = await detail.getPlanetType(7, planetKey);

    expect(repo.exists).toHaveBeenCalledWith({ where: { userId: 7, swuTypeKey: planetKey } });
    expect(result).toMatchObject({ key: planetKey, objectType: 'Planet', name: expect.stringContaining(archetype.typeName) });
    expect(result.zones.length).toBeGreaterThan(0);
    expect(result.zones[0].surface[0].length).toBeGreaterThan(0);
    // A fixed seed per type keeps the example stable between visits.
    expect((await detail.getPlanetType(7, planetKey)).zones).toEqual(result.zones);
  });

  it('resolves every listed key, including variant A, planets, moons, rings and tidal-locked bodies', async () => {
    const keys = SWU_PLANET_ARCHETYPES.flatMap((type) =>
      ['RB', 'GB', 'RR', 'RM'].map((code) => `${buildSwuTestClassId(type.typeId, type.variant)}:${code}`),
    );
    const resolvable = await Promise.all(
      keys.map((key) => service(true).service.getPlanetType(7, key).then(() => key, () => null)),
    );
    // Gas giant A shares index 0 with "no variant" in the class id (tmw-AUD-03b review).
    const gasGiantA = `${buildSwuTestClassId(15, 'A')}:RB`;
    expect(resolvable).toContain(gasGiantA);
  });

  it('hides undiscovered and unknown planet types', async () => {
    await expect(service(false).service.getPlanetType(7, planetKey)).rejects.toThrow(NotFoundException);
    await expect(service(true).service.getPlanetType(7, '1:XX')).rejects.toThrow(NotFoundException);
  });

  it('returns catalogue values of a discovered system type and hides undiscovered ones', async () => {
    const type = SYSTEM_TYPE_DEFINITIONS[0];
    await expect(service(true).service.getSystemType(7, type.id)).resolves.toMatchObject({
      systemTypeId: type.id,
      name: type.name,
      gridSize: { min: type.gridSizeMin, max: type.gridSizeMax },
    });
    await expect(service(false).service.getSystemType(7, type.id)).rejects.toThrow(NotFoundException);
  });
});
