import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MessageTargetKind } from '@swuniverse/shared';
import { MessageFolder } from './message-folder';
import { MessagingService } from './messaging.service';

describe('MessagingService', () => {
  const messageRepo = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 1, ...value })),
  };
  const userRepo = { findOneBy: jest.fn(), findByIds: jest.fn() };
  const statisticsService = { countEvent: jest.fn() };
  const gateway = { emitToUser: jest.fn() };
  const settingsReader = { getManyBoolean: jest.fn() };
  let service: MessagingService;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo.findOneBy.mockReset();
    service = new MessagingService(
      messageRepo as never,
      userRepo as never,
      statisticsService as never,
      gateway as never,
      settingsReader as never,
    );
  });

  it.each([
    [true, true, true, true],
    [false, true, true, false],
    [true, false, true, false],
    [true, true, false, false],
  ])(
    'returns readReceipt=%s/%s/read=%s as %s without exposing isRead',
    async (senderEnabled, recipientEnabled, isRead, expected) => {
      messageRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 7,
            senderId: 1,
            recipientId: 2,
            isRead,
            recipient: { username: 'Han' },
          },
        ],
        1,
      ]);
      settingsReader.getManyBoolean.mockResolvedValue(
        new Map([
          [1, senderEnabled],
          [2, recipientEnabled],
        ]),
      );

      const result = await service.getSent(1);

      expect(result.data[0]).toEqual(
        expect.objectContaining({ readReceipt: expected }),
      );
      expect(result.data[0]).not.toHaveProperty('isRead');
      expect(settingsReader.getManyBoolean).toHaveBeenCalledTimes(1);
    },
  );

  it('delivers a trade message in an NPC account name', async () => {
    userRepo.findOneBy
      .mockResolvedValueOnce({ id: 9, isNpc: true })
      .mockResolvedValueOnce({ id: 2, isNpc: false });

    await service.sendNpcTrade(9, 2, 'Die Ware ist da.');

    expect(messageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        senderId: 9,
        recipientId: 2,
        folder: MessageFolder.TRADE,
      }),
    );
    expect(statisticsService.countEvent).not.toHaveBeenCalled();
  });

  it('rejects an unknown recipient', async () => {
    userRepo.findOneBy.mockResolvedValue(null);

    await expect(
      service.send(1, 99, 'Lange Nachricht'),
    ).rejects.toThrow(new NotFoundException('Dieser Siedler existiert nicht'));
    expect(messageRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a message to the sender', async () => {
    await expect(
      service.send(1, 1, 'Lange Nachricht'),
    ).rejects.toThrow(
      new BadRequestException('Du kannst Dir keine Nachricht schicken'),
    );
  });

  it('checks the ignore hook before sending', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 2 });
    const ignored = jest.fn().mockResolvedValue(true);
    service.setIgnoreCheck(ignored);

    await expect(
      service.send(1, 2, 'Lange Nachricht'),
    ).rejects.toThrow(new ForbiddenException('Der Siedler ignoriert Dich'));
    expect(ignored).toHaveBeenCalledWith(2, 1);
  });

  it('trims and sends a valid personal message', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 2 });

    await service.send(1, 2, '  Lange Nachricht  ');

    expect(messageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        senderId: 1,
        recipientId: 2,
        body: 'Lange Nachricht',
        folder: MessageFolder.PERSONAL,
      }),
    );
  });

  it('notifies the recipient after persisting a personal message', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 2 });

    await service.send(1, 2, 'Lange Nachricht');

    expect(gateway.emitToUser).toHaveBeenCalledWith(2, 'MESSAGE_RECEIVED', {
      folder: MessageFolder.PERSONAL,
    });
  });

  it('persists an optional target for a system message', async () => {
    await service.sendSystem(
      2,
      'Meldung',
      undefined,
      MessageFolder.SYSTEM,
      {
        kind: MessageTargetKind.SPACECRAFT,
        id: 17,
      },
    );

    expect(messageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        targetKind: MessageTargetKind.SPACECRAFT,
        targetId: 17,
      }),
    );
    expect(gateway.emitToUser).toHaveBeenCalledWith(2, 'MESSAGE_RECEIVED', {
      folder: MessageFolder.SYSTEM,
    });
  });

  it('returns only visible personal correspondence newest first', async () => {
    messageRepo.find.mockResolvedValue([{ id: 4 }]);

    await expect(service.getCorrespondence(1, 2)).resolves.toEqual([{ id: 4 }]);
    expect(messageRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['sender'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),
    );
    const where = messageRepo.find.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          senderId: 2,
          recipientId: 1,
          isSystem: false,
          deletedByRecipient: false,
        }),
        expect.objectContaining({
          senderId: 1,
          recipientId: 2,
          isSystem: false,
          deletedBySender: false,
        }),
      ]),
    );
  });

  it('queries paginated personal conversations without exposing foreign messages', async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      clone: jest.fn(),
      getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn(),
    };
    queryBuilder.clone.mockReturnValue(queryBuilder);
    (messageRepo as Record<string, jest.Mock>).createQueryBuilder = jest.fn(
      () => queryBuilder,
    );
    userRepo.findByIds.mockResolvedValue([]);

    await expect(service.getConversations(7, 2)).resolves.toEqual({
      data: [],
      total: 0,
      page: 2,
      limit: 20,
    });
    expect(queryBuilder.where).toHaveBeenCalledWith(
      '(message."senderId" = :userId AND message."deletedBySender" = false) OR (message."recipientId" = :userId AND message."deletedByRecipient" = false)',
      { userId: 7 },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'message.folder = :folder AND message."isSystem" = false',
      { folder: MessageFolder.PERSONAL },
    );
    expect(queryBuilder.offset).toHaveBeenCalledWith(20);
    expect(queryBuilder.limit).toHaveBeenCalledWith(20);
  });
});
