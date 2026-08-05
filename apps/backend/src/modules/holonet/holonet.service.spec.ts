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
import { STU_PRESTIGE } from '../prestige/prestige.constants';

describe('HolonetService prestige ratings', () => {
  const authorId = 11;
  const voterId = 22;
  let post: { id: number; authorId: number; rating: number };
  let postRepo: {
    findOneBy: jest.Mock;
    save: jest.Mock;
  };
  let ratingRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let userRepo: {
    increment: jest.Mock;
    decrement: jest.Mock;
  };
  let service: HolonetService;

  beforeEach(() => {
    post = { id: 1, authorId, rating: 0 };
    postRepo = {
      findOneBy: jest.fn().mockResolvedValue(post),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    ratingRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => value),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    userRepo = {
      increment: jest.fn().mockResolvedValue(undefined),
      decrement: jest.fn().mockResolvedValue(undefined),
    };
    service = new HolonetService(
      postRepo as never,
      {} as never,
      ratingRepo as never,
      {} as never,
      userRepo as never,
      {} as never,
    );
  });

  it('awards 5 prestige for a positive HoloNet vote', async () => {
    await service.rate(post.id, voterId, 1);

    expect(post.rating).toBe(1);
    expect(ratingRepo.create).toHaveBeenCalledWith({
      postId: post.id,
      userId: voterId,
      value: 1,
    });
    expect(userRepo.increment).toHaveBeenCalledWith(
      { id: authorId },
      'prestige',
      STU_PRESTIGE.HOLONET_POSITIVE_RATING,
    );
    expect(userRepo.decrement).not.toHaveBeenCalled();
  });

  it('does not change prestige for a negative HoloNet vote', async () => {
    await service.rate(post.id, voterId, -1);

    expect(post.rating).toBe(-1);
    expect(ratingRepo.create).toHaveBeenCalledWith({
      postId: post.id,
      userId: voterId,
      value: -1,
    });
    expect(userRepo.increment).not.toHaveBeenCalled();
    expect(userRepo.decrement).not.toHaveBeenCalled();
  });

  it('rejects any second HoloNet vote by the same user', async () => {
    ratingRepo.findOne.mockResolvedValue({
      postId: post.id,
      userId: voterId,
      value: 1,
    });

    await expect(service.rate(post.id, voterId, -1)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(post.rating).toBe(0);
    expect(ratingRepo.save).not.toHaveBeenCalled();
    expect(postRepo.save).not.toHaveBeenCalled();
    expect(userRepo.increment).not.toHaveBeenCalled();
    expect(userRepo.decrement).not.toHaveBeenCalled();
  });
});
