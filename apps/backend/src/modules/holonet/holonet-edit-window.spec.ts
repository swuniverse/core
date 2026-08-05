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

import { BadRequestException } from '@nestjs/common';
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
    remove: jest.Mock;
  };
  let service: HolonetService;

  beforeEach(() => {
    post = {
      id: 1,
      authorId: userId,
      title: 'old',
      body: 'old body',
      createdAt: new Date(Date.now() - 9 * 60 * 1000),
    };
    postRepo = {
      findOne: jest.fn().mockResolvedValue(post),
      save: jest.fn().mockImplementation(async (value) => value),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    service = new HolonetService(
      postRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('allows editing within 10 minutes', async () => {
    await service.update(post.id, userId, 'new', 'new body');

    expect(post.title).toBe('new');
    expect(post.body).toBe('new body');
    expect(postRepo.save).toHaveBeenCalledWith(post);
  });

  it('rejects editing after 10 minutes', async () => {
    post.createdAt = new Date(Date.now() - 11 * 60 * 1000);

    await expect(service.update(post.id, userId, 'new', 'new body')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(postRepo.save).not.toHaveBeenCalled();
  });

  it('allows deleting within 10 minutes', async () => {
    await service.delete(post.id, userId);

    expect(postRepo.remove).toHaveBeenCalledWith(post);
  });

  it('rejects deleting after 10 minutes', async () => {
    post.createdAt = new Date(Date.now() - 11 * 60 * 1000);

    await expect(service.delete(post.id, userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(postRepo.remove).not.toHaveBeenCalled();
  });
});
