import { InfluenceService } from './influence.service';

describe('InfluenceService territorial colors', () => {
  it('resolves player colors from current settings and membership without changing faction colors', async () => {
    const areas = [
      { cx: 1, cy: 1, sourceType: 'PLAYER', sourceId: 1, strength: 1 },
      { cx: 2, cy: 1, sourceType: 'PLAYER', sourceId: 2, strength: 1 },
      { cx: 3, cy: 1, sourceType: 'PLAYER', sourceId: 3, strength: 1 },
      { cx: 4, cy: 1, sourceType: 'PLAYER', sourceId: 4, strength: 1 },
      { cx: 5, cy: 1, sourceType: 'FACTION', sourceId: 9, strength: 1 },
      { cx: 6, cy: 1, sourceType: 'ALLIANCE', sourceId: 10, strength: 1 },
    ];
    const query = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue(areas) };
    const memberships = [
      { userId: 2, alliance: { color: '#112233' } },
      { userId: 3, alliance: { color: null } },
    ];
    const settings = [
      { userId: 1, value: '#abcdef' },
      { userId: 2, value: '#123456' },
      { userId: 3, value: '#654321' },
      { userId: 4, value: '' },
    ];
    const service = new InfluenceService(
      { createQueryBuilder: () => query } as any,
      { find: jest.fn().mockResolvedValue([{ id: 10, color: null, faction: { colorPrimary: '#010203' } }]) } as any,
      { findBy: jest.fn().mockResolvedValue([{ id: 9, colorPrimary: '#aabbcc' }]) } as any,
      { find: jest.fn(async () => memberships) } as any,
      { find: jest.fn(async () => settings) } as any,
    );

    const result = await service.getInfluenceInSector(1, 1, 6, 1, 1);
    expect(result.map((area) => area.color)).toEqual([
      '#abcdef', '#112233', '#654321', '#64748b', '#aabbcc', '#010203',
    ]);

    memberships[0].alliance.color = '#445566';
    settings[0].value = '#fedcba';
    const updated = await service.getInfluenceInSector(1, 1, 6, 1, 1);
    expect(updated[0].color).toBe('#fedcba');
    expect(updated[1].color).toBe('#445566');
    memberships.splice(0, 1);
    expect((await service.getInfluenceInSector(1, 1, 6, 1, 1))[1].color).toBe('#123456');
  });
});
