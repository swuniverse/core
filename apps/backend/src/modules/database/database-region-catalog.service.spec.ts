import { In } from 'typeorm';
import { DatabaseRegionCatalogService } from './database-region-catalog.service';

describe('DatabaseRegionCatalogService', () => {
  const discoveredAt = new Date('2026-11-15T10:00:00.000Z');
  const regions = [
    { id: 3, layerId: 1, name: 'Hutt-Raum', description: 'Schmuggler und Kartelle', layer: { name: 'Äußerer Rand' } },
    { id: 4, layerId: 1, name: 'Kessel-Route', description: 'Gefährliche Abkürzung', layer: { name: 'Äußerer Rand' } },
  ];
  const regionRepo = { find: jest.fn(async () => regions) };
  const discoveryRepo = { find: jest.fn(async () => [{ mapRegionId: 3, discoveredAt }]) };
  const service = new DatabaseRegionCatalogService(regionRepo as never, discoveryRepo as never, {} as never, {} as never, {} as never);

  it('shows discovered regions with name, description and layer and masks the others', async () => {
    await expect(service.getRegions(7, [1])).resolves.toEqual({
      discovered: 1,
      total: 2,
      entries: [
        {
          regionId: 3,
          discovered: true,
          name: 'Hutt-Raum',
          description: 'Schmuggler und Kartelle',
          layerId: 1,
          layerName: 'Äußerer Rand',
          discoveredAt: discoveredAt.toISOString(),
        },
        {
          regionId: 4,
          discovered: false,
          name: null,
          description: null,
          layerId: null,
          layerName: null,
          discoveredAt: null,
        },
      ],
    });
    expect(regionRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { layerId: In([1]) } }));
    expect(discoveryRepo.find).toHaveBeenCalledWith({ where: { userId: 7 } });
  });

  it('lists nothing without accessible layers', async () => {
    regionRepo.find.mockClear();

    await expect(service.getRegions(7, [])).resolves.toEqual({ discovered: 0, total: 0, entries: [] });
    expect(regionRepo.find).not.toHaveBeenCalled();
  });
});

describe('DatabaseRegionCatalogService region map', () => {
  const fieldType = { name: 'Leerer Raum', effects: null };
  const area = [
    { cx: 4, cy: 4, regionId: 3, fieldTypeId: 1, fieldType, effects: ['EPS_LEAK'], starSystem: { name: 'Bespin' } },
    { cx: 5, cy: 4, regionId: 3, fieldTypeId: 1, fieldType, effects: null, starSystem: null },
    { cx: 3, cy: 4, regionId: null, fieldTypeId: 1, fieldType, effects: null, starSystem: null },
    { cx: 6, cy: 4, regionId: 9, fieldTypeId: 1, fieldType, effects: null, starSystem: null },
  ];
  function regionService(discovered: boolean, explored: Array<{ cx: number; cy: number }>, fullyExplored = false) {
    const fieldRepo = {
      find: jest.fn(async (options: { where: { regionId?: number } }) =>
        options.where.regionId ? area.filter((field) => field.regionId === 3) : area),
    };
    return new DatabaseRegionCatalogService(
      { findOne: jest.fn(async () => ({ id: 3, layerId: 1, name: 'Anoat', description: 'Gasriesen', layer: { name: 'Galaxis', width: 50, height: 50 } })) } as never,
      { exists: jest.fn(async () => discovered) } as never,
      fieldRepo as never,
      { find: jest.fn(async () => explored) } as never,
      { exists: jest.fn(async () => fullyExplored) } as never,
    );
  }

  it('shows region fields and only explored margin fields', async () => {
    const detail = await regionService(true, [{ cx: 3, cy: 4 }]).getRegion(7, 3);

    expect(detail).toMatchObject({ name: 'Anoat', bounds: { minX: 3, maxX: 6, minY: 3, maxY: 5 } });
    expect(detail.fields.map((field) => [field.cx, field.inRegion])).toEqual([[4, true], [5, true], [3, false]]);
    expect(detail.fields[0]).toMatchObject({ effectTexts: ['Leck am EPS'], starSystemName: 'Bespin' });
  });

  it('shows every margin field once the whole layer is explored', async () => {
    const detail = await regionService(true, [], true).getRegion(7, 3);

    expect(detail.fields.map((field) => field.cx)).toEqual([4, 5, 3, 6]);
  });

  it('hides undiscovered regions', async () => {
    await expect(regionService(false, []).getRegion(7, 3)).rejects.toThrow('Region nicht katalogisiert');
  });
});
