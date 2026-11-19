import { SpacecraftStatus } from '../spacecraft/entities/spacecraft.entity';
import { ColonyProjectionService } from './colony-projection.service';

describe('shipyard hull counters', () => {
  it('counts own non-destroyed ships per hull in one grouped query', async () => {
    const qb: Record<string, jest.Mock> = {};
    for (const m of ['select', 'addSelect', 'where', 'andWhere', 'groupBy']) {
      qb[m] = jest.fn(() => qb);
    }
    qb.getRawMany = jest.fn(async () => [
      { shipClassId: 4, count: '3' },
      { shipClassId: 7, count: '1' },
    ]);
    const shipRepo = { createQueryBuilder: jest.fn(() => qb) };
    const service = Object.assign(
      Object.create(ColonyProjectionService.prototype),
      { shipRepo },
    );

    const counts = await service.countShipsByClass(9);

    expect(counts.get(4)).toBe(3);
    expect(counts.get(7)).toBe(1);
    expect(counts.get(99)).toBeUndefined();
    expect(shipRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(qb.where).toHaveBeenCalledWith('s.userId = :userId', { userId: 9 });
    expect(qb.andWhere).toHaveBeenCalledWith('s.status != :destroyed', {
      destroyed: SpacecraftStatus.DESTROYED,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('s.rpgHidden = false');
    expect(qb.groupBy).toHaveBeenCalledWith('s.shipClassId');
  });
});
