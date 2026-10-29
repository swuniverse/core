import { ProfileVisitorService } from './profile-visitor.service';

describe('ProfileVisitorService', () => {
  it('upserts a foreign profile visit with the current timestamp', async () => {
    const visitorRepo = { upsert: jest.fn() };
    const settingRepo = { findOneBy: jest.fn().mockResolvedValue(null) };
    const service = new ProfileVisitorService(
      visitorRepo as never,
      settingRepo as never,
    );
    const now = new Date('2026-10-29T12:00:00.000Z');

    await service.registerVisit(4, 9, now);

    expect(visitorRepo.upsert).toHaveBeenCalledWith(
      { visitorId: 4, profileUserId: 9, visitedAt: now },
      ['visitorId', 'profileUserId'],
    );
  });

  it('does not record a visit to the visitor own profile', async () => {
    const visitorRepo = { upsert: jest.fn() };
    const settingRepo = { findOneBy: jest.fn() };
    const service = new ProfileVisitorService(
      visitorRepo as never,
      settingRepo as never,
    );

    await service.registerVisit(4, 4);

    expect(visitorRepo.upsert).not.toHaveBeenCalled();
    expect(settingRepo.findOneBy).not.toHaveBeenCalled();
  });

  it('does not record a visitor who opted out', async () => {
    const visitorRepo = { upsert: jest.fn() };
    const settingRepo = {
      findOneBy: jest.fn().mockResolvedValue({ value: '1' }),
    };
    const service = new ProfileVisitorService(
      visitorRepo as never,
      settingRepo as never,
    );

    await service.registerVisit(4, 9);

    expect(settingRepo.findOneBy).toHaveBeenCalledWith({
      userId: 4,
      key: 'profile_visit_optout',
    });
    expect(visitorRepo.upsert).not.toHaveBeenCalled();
  });

  it('returns the latest visitors newest first with public identity', async () => {
    const visitedAt = new Date('2026-10-29T10:00:00.000Z');
    const visitorRepo = {
      find: jest.fn().mockResolvedValue([
        {
          visitorId: 4,
          visitedAt,
          visitor: { username: 'Leia', displayName: 'General Organa' },
        },
      ]),
    };
    const service = new ProfileVisitorService(visitorRepo as never, {} as never);

    await expect(service.getRecentVisitors(9)).resolves.toEqual([
      {
        userId: 4,
        username: 'Leia',
        displayName: 'General Organa',
        visitedAt: visitedAt.toISOString(),
      },
    ]);
    expect(visitorRepo.find).toHaveBeenCalledWith({
      where: { profileUserId: 9 },
      relations: { visitor: true },
      order: { visitedAt: 'DESC' },
      take: 10,
    });
  });

  it('deletes profile visits older than seven days during maintenance', async () => {
    const visitorRepo = { delete: jest.fn().mockResolvedValue({ affected: 3 }) };
    const service = new ProfileVisitorService(visitorRepo as never, {} as never);
    const now = new Date('2026-10-29T12:00:00.000Z');

    await expect(service.run(now)).resolves.toBe('3 profile visits deleted');
    expect(visitorRepo.delete).toHaveBeenCalledWith({
      visitedAt: expect.objectContaining({
        _value: new Date('2026-10-22T12:00:00.000Z'),
        _type: 'lessThan',
      }),
    });
  });
});
