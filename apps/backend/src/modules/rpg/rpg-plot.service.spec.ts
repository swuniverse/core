import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RpgPlotService } from './rpg-plot.service';

const creator = { id: 7, username: 'Leia' };
const writer = { id: 8, username: 'Han' };
const startedAt = new Date('2026-10-28T10:00:00.000Z');

type TransactionManager = {
  getRepository: (entity?: unknown) => MockRepository;
};

type MockRepository = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
  findAndCount: jest.Mock;
  manager: {
    transaction: <T>(run: (manager: TransactionManager) => Promise<T>) => Promise<T>;
  };
};

function repository(): MockRepository {
  const repo = {
    create: jest.fn((value: unknown) => value),
    save: jest.fn(async (value: unknown) => value),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  } as unknown as MockRepository;
  repo.manager = {
    transaction: (run) => run({ getRepository: () => repo }),
  };
  return repo;
}

describe('RpgPlotService', () => {
  const plots = repository();
  const members = repository() as ReturnType<typeof repository> & {
    findOneBy: jest.Mock;
    delete: jest.Mock;
  };
  members.findOneBy = jest.fn();
  members.delete = jest.fn();
  plots.manager.transaction = (run) =>
    run({
      getRepository: (entity?: unknown) =>
        String(entity).includes('RpgPlotMember') ? members : plots,
    });
  const users = { findOneBy: jest.fn() };
  const messages = { sendSystem: jest.fn() };
  const service = new RpgPlotService(
    plots as never,
    members as never,
    users as never,
    messages as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a validated plot and makes the creator its first member', async () => {
    const saved = {
      id: 11,
      creatorId: creator.id,
      title: 'Echo Base Rescue',
      description: '[b]Briefing[/b]',
      startedAt,
      endedAt: null,
      creator,
      members: [],
    };
    plots.save.mockResolvedValue(saved);
    plots.findOne.mockResolvedValue({
      ...saved,
      members: [{ userId: creator.id, user: creator, joinedAt: startedAt }],
    });

    const result = await service.create(creator.id, {
      title: '  Echo Base Rescue  ',
      description: '[b]Briefing[/b]',
    });

    expect(plots.create).toHaveBeenCalledWith({
      creatorId: creator.id,
      title: 'Echo Base Rescue',
      description: '[b]Briefing[/b]',
    });
    expect(members.save).toHaveBeenCalledWith({ plotId: 11, userId: creator.id });
    expect(result.title).toBe('Echo Base Rescue');
    expect(result.creatorName).toBe('Leia');
    expect(result.members).toEqual([
      expect.objectContaining({ userId: creator.id, username: 'Leia' }),
    ]);
  });

  it('returns no memberships without loading plots when the player is not a member', async () => {
    members.find.mockResolvedValue([]);

    await expect(service.membershipsForUser(8)).resolves.toEqual([]);
    expect(plots.find).not.toHaveBeenCalled();
  });

  it('lists every membership for a player without pagination, active first', async () => {
    members.find.mockResolvedValue([{ plotId: 11 }, { plotId: 12 }]);
    plots.find.mockResolvedValue([
      { id: 11, title: 'Active', endedAt: null },
      { id: 12, title: 'Ended', endedAt: startedAt },
    ]);

    await expect(service.membershipsForUser(8)).resolves.toMatchObject([
      { id: 11, title: 'Active', endedAt: null },
      { id: 12, title: 'Ended', endedAt: startedAt },
    ]);
    expect(members.find).toHaveBeenCalledWith({ where: { userId: 8 }, select: ['plotId'] });
    expect(plots.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: expect.anything() },
      order: { endedAt: { direction: 'ASC', nulls: 'FIRST' }, startedAt: 'DESC', id: 'DESC' },
    }));
    expect(plots.find).not.toHaveBeenCalledWith(expect.objectContaining({ take: expect.any(Number) }));
  });

  it('lists active plots first with pagination', async () => {
    plots.findAndCount.mockResolvedValue([[{ id: 11, title: 'Active', members: [] }], 21]);

    const result = await service.list(2);

    expect(plots.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        order: {
          endedAt: { direction: 'ASC', nulls: 'FIRST' },
          startedAt: 'DESC',
          id: 'DESC',
        },
        skip: 20,
        take: 20,
      }),
    );
    expect(result).toMatchObject({ page: 2, totalItems: 21, totalPages: 2 });
  });

  it('validates title and description limits', async () => {
    await expect(
      service.create(creator.id, { title: 'short', description: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(creator.id, {
        title: 'Valid title',
        description: 'x'.repeat(5_001),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forbids non-creators and prevents changes after the plot ended', async () => {
    plots.findOne.mockResolvedValue({
      id: 11,
      creatorId: creator.id,
      endedAt: null,
    });
    await expect(
      service.update(writer.id, 11, { title: 'Updated title', description: '' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    plots.findOne.mockResolvedValue({
      id: 11,
      creatorId: creator.id,
      endedAt: startedAt,
    });
    await expect(
      service.update(creator.id, 11, { title: 'Updated title', description: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.addMember(creator.id, 11, writer.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('ends an active plot for its creator', async () => {
    const plot = { id: 11, creatorId: creator.id, endedAt: null };
    plots.findOne.mockResolvedValue(plot);
    plots.save.mockImplementation(async (value: unknown) => value);

    const result = await service.end(creator.id, 11);

    expect(result.endedAt).not.toBeNull();
    expect(plots.save).toHaveBeenCalledWith(plot);
  });

  it('adds and removes writers with system messages', async () => {
    const plot = {
      id: 11,
      creatorId: creator.id,
      title: 'Echo Base Rescue',
      endedAt: null,
    };
    plots.findOne.mockResolvedValue(plot);
    users.findOneBy.mockResolvedValue(writer);
    members.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce({
      plotId: 11,
      userId: writer.id,
    });

    await service.addMember(creator.id, 11, writer.id);
    await service.removeMember(creator.id, 11, writer.id);

    expect(messages.sendSystem).toHaveBeenNthCalledWith(
      1,
      writer.id,
      'RPG-Plot',
      "Du wurdest dem RPG-Plot 'Echo Base Rescue' als Schreiber hinzugefügt",
    );
    expect(messages.sendSystem).toHaveBeenNthCalledWith(
      2,
      writer.id,
      'RPG-Plot',
      "Du wurdest aus dem RPG-Plot 'Echo Base Rescue' als Schreiber entfernt",
    );
  });

  it('rejects duplicate writers, missing players, and creator removal', async () => {
    const plot = {
      id: 11,
      creatorId: creator.id,
      title: 'Echo Base Rescue',
      endedAt: null,
    };
    plots.findOne.mockResolvedValue(plot);
    users.findOneBy.mockResolvedValue(null);
    await expect(service.addMember(creator.id, 11, writer.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    users.findOneBy.mockResolvedValue(writer);
    members.findOneBy.mockResolvedValue({ plotId: 11, userId: writer.id });
    await expect(service.addMember(creator.id, 11, writer.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.removeMember(creator.id, 11, creator.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
