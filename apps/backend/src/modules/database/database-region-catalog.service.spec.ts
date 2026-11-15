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
  const service = new DatabaseRegionCatalogService(regionRepo as never, discoveryRepo as never);

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
