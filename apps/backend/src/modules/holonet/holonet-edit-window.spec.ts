jest.mock('./entities/holonet-post.entity', () => ({
  HolonetPost: class HolonetPost {},
  PostCategory: {
    NEWS: 'NEWS',
    ROLEPLAY: 'ROLEPLAY',
    TRADE: 'TRADE',
    RECRUITMENT: 'RECRUITMENT',
  },
}));
jest.mock('./entities/holonet-comment.entity', () => ({
  HolonetComment: class HolonetComment {},
}));
jest.mock('./entities/holonet-rating.entity', () => ({
  HolonetRating: class HolonetRating {},
}));
jest.mock('./entities/holonet-checkpoint.entity', () => ({
  HolonetCheckpoint: class HolonetCheckpoint {},
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { HolonetController } from './holonet.controller';
import { HolonetService } from './holonet.service';

describe('HolonetService edit window', () => {
  const userId = 7;
  let post: {
    id: number;
    authorId: number;
    title: string;
    body: string;
    createdAt: Date;
  };
  let postRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    softRemove: jest.Mock;
  };
  let messagingService: { sendSystem: jest.Mock };
  let userRepo: { findOneBy: jest.Mock };
  let service: HolonetService;

  beforeEach(() => {
    post = {
      id: 1,
      authorId: userId,
      title: 'Alter Titel',
      body: 'Alter Beitragstext',
      createdAt: new Date(Date.now() - 9 * 60 * 1000),
    };
    postRepo = {
      findOne: jest.fn().mockResolvedValue(post),
      save: jest.fn().mockImplementation(async (value) => value),
      softRemove: jest.fn().mockResolvedValue(undefined),
    };
    userRepo = {
      findOneBy: jest.fn().mockResolvedValue({ id: 99, username: 'Tarkin' }),
    };
    messagingService = { sendSystem: jest.fn().mockResolvedValue(undefined) };
    service = new HolonetService(
      postRepo as never,
      {} as never,
      {} as never,
      {} as never,
      userRepo as never,
      messagingService as never,
      {} as never,
    );
  });

  it('allows editing within 10 minutes', async () => {
    await service.update(post.id, userId, 'Neuer Titel', 'Neuer Text');

    expect(post.title).toBe('Neuer Titel');
    expect(post.body).toBe('Neuer Text');
    expect(postRepo.save).toHaveBeenCalledWith(post);
  });

  it('rejects editing after 10 minutes', async () => {
    post.createdAt = new Date(Date.now() - 11 * 60 * 1000);

    await expect(
      service.update(post.id, userId, 'Neuer Titel', 'Neuer Text'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(postRepo.save).not.toHaveBeenCalled();
  });

  it('allows deleting within 10 minutes', async () => {
    await service.delete(post.id, userId);

    expect(postRepo.softRemove).toHaveBeenCalledWith(post);
  });

  it('rejects deleting after 10 minutes', async () => {
    post.createdAt = new Date(Date.now() - 11 * 60 * 1000);

    await expect(service.delete(post.id, userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(postRepo.softRemove).not.toHaveBeenCalled();
  });

  it('rejects non-admin access to the admin deletion endpoint', () => {
    const guard = new AdminGuard();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { isAdmin: false } }) }),
    };

    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException);
  });

  it.each([
    [undefined, 'Der HoloNet-Beitrag mit der ID 1 wurde vom Admin Tarkin gelöscht.'],
    [
      '  Verstoß gegen die Regeln  ',
      'Der HoloNet-Beitrag mit der ID 1 wurde vom Admin Tarkin gelöscht. Begründung: Verstoß gegen die Regeln',
    ],
  ])('soft-deletes a foreign post as admin and notifies its author', async (reason, body) => {
    await service.adminDelete(post.id, 99, reason);

    expect(postRepo.softRemove).toHaveBeenCalledWith(post);
    expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: 99 });
    expect(messagingService.sendSystem).toHaveBeenCalledWith(
      userId,
      'HoloNet-Beitrag gelöscht',
      body,
    );
  });

  it('rejects an admin deletion reason longer than 500 characters', async () => {
    await expect(service.adminDelete(post.id, 99, 'x'.repeat(501))).rejects.toThrow(
      'Die Begründung darf höchstens 500 Zeichen lang sein.',
    );
    expect(postRepo.softRemove).not.toHaveBeenCalled();
    expect(messagingService.sendSystem).not.toHaveBeenCalled();
  });

  it('allows an admin to edit another player’s old post through the controller', async () => {
    post.createdAt = new Date(Date.now() - 11 * 60 * 1000);
    postRepo.findOne.mockResolvedValue(post);
    const controller = new HolonetController(service);

    await controller.update(
      post.id,
      { user: { sub: 99, isAdmin: true } },
      'Admin Titel',
      'Admin Beitrag',
    );

    expect(post.title).toBe('Admin Titel');
    expect(post.body).toBe('Admin Beitrag');
  });

  it('rejects invalid create boundaries and accepts Unicode code points', async () => {
    const createRepo = {
      ...postRepo,
      create: jest.fn((value) => value),
    };
    const createService = new HolonetService(
      createRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      createService.create(userId, 'Kurz', 'x'.repeat(50), 'NEWS' as never),
    ).rejects.toThrow('Der Titel muss 6 bis 80 Zeichen lang sein.');
    await expect(
      createService.create(userId, 'Gültig', 'x'.repeat(49), 'NEWS' as never),
    ).rejects.toThrow('Der Text muss mindestens 50 Zeichen lang sein.');
    await expect(
      createService.create(userId, 'Gültig', 'x'.repeat(50), 'INVALID' as never),
    ).rejects.toThrow('Ungültige HoloNet-Kategorie.');
    await expect(
      createService.create(userId, 'Gültig', 'x'.repeat(20_001), 'NEWS' as never),
    ).rejects.toThrow('Der Text darf höchstens 20000 Zeichen lang sein.');

    await createService.create(
      userId,
      '🚀🚀🚀🚀🚀🚀',
      '🚀'.repeat(50),
      'NEWS' as never,
    );
    expect(createRepo.create).toHaveBeenCalledWith({
      authorId: userId,
      title: '🚀🚀🚀🚀🚀🚀',
      body: '🚀'.repeat(50),
      category: 'NEWS',
    });
  });

  it('validates trimmed edit boundaries', async () => {
    await expect(
      service.update(post.id, userId, '  Kurz  ', 'Zehn Zeichen'),
    ).rejects.toThrow('Der Titel muss 6 bis 80 Zeichen lang sein.');
    await expect(
      service.update(post.id, userId, 'Gültig', '  zu kurz  '),
    ).rejects.toThrow('Der Text muss mindestens 10 Zeichen lang sein.');
  });

  it('hides soft-deleted posts from permalink lookup', async () => {
    postRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne(post.id, userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(postRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: post.id, deletedAt: expect.anything() } }),
    );
  });
});
