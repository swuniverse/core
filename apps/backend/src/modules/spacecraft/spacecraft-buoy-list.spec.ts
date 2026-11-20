import { SpacecraftService } from './spacecraft.service';

describe('SpacecraftService.listBuoys', () => {
  it('lists own buoys with owner and STU sector string', async () => {
    const createdAt = new Date('2026-11-20T10:00:00Z');
    const find = jest.fn(async () => [
      {
        id: 1,
        userId: 7,
        user: { username: 'Mon Mothma' },
        text: 'Basis',
        createdAt,
        location: { galaxyField: null, systemField: { sx: 3, sy: 4, starSystem: { name: 'Yavin' } } },
      },
      {
        id: 2,
        userId: 7,
        user: { username: 'Mon Mothma' },
        text: 'Tiefraum',
        createdAt,
        location: { galaxyField: { cx: 12, cy: 34 }, systemField: null },
      },
    ]);
    const service = Object.assign(Object.create(SpacecraftService.prototype), {
      buoyRepo: { find },
    }) as SpacecraftService;

    await expect(service.listBuoys(7)).resolves.toEqual([
      { id: 1, text: 'Basis', ownerId: 7, ownerName: 'Mon Mothma', createdAt: createdAt.toISOString(), sector: '3|4 (Yavin-System)' },
      { id: 2, text: 'Tiefraum', ownerId: 7, ownerName: 'Mon Mothma', createdAt: createdAt.toISOString(), sector: '12|34' },
    ]);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 7 } }));
  });
});
