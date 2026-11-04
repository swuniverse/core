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
jest.mock('../rpg/rpg-plot.entity', () => ({ RpgPlot: class RpgPlot {} }));
jest.mock('../rpg/rpg-plot-member.entity', () => ({
  RpgPlotMember: class RpgPlotMember {},
}));

import { BadRequestException } from '@nestjs/common';
import { MessageTargetKind } from '@swuniverse/shared';
import { HolonetService } from './holonet.service';
import { STU_PRESTIGE } from '../prestige/prestige.constants';

describe('HolonetService public behavior', () => {
  const authorId = 11;
  const voterId = 22;
  let post: { id: number; authorId: number; rating: number };
  let postRepo: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let ratingRepo: {
    findOne: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let userRepo: {
    decrement: jest.Mock;
    findOneBy: jest.Mock;
  };
  let prestigeService: { change: jest.Mock };
  let commentRepo: {
    findAndCount: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    softRemove: jest.Mock;
  };
  let checkpointRepo: { findOneBy: jest.Mock };
  let messagingService: { sendSystem: jest.Mock };
  let service: HolonetService;

  beforeEach(() => {
    post = { id: 1, authorId, rating: 0 };
    postRepo = {
      findOne: jest.fn().mockResolvedValue(post),
      findOneBy: jest.fn().mockResolvedValue(post),
      save: jest.fn().mockImplementation(async (value) => value),
      update: jest.fn().mockResolvedValue(undefined),
    };
    commentRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => value),
      softRemove: jest.fn().mockResolvedValue(undefined),
    };
    checkpointRepo = { findOneBy: jest.fn().mockResolvedValue(null) };
    messagingService = { sendSystem: jest.fn().mockResolvedValue(undefined) };
    ratingRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => value),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    userRepo = {
      decrement: jest.fn().mockResolvedValue(undefined),
      findOneBy: jest.fn().mockResolvedValue({ username: 'Kommentator' }),
    };
    prestigeService = { change: jest.fn().mockResolvedValue(undefined) };
    service = new HolonetService(
      postRepo as never,
      commentRepo as never,
      ratingRepo as never,
      checkpointRepo as never,
      userRepo as never,
      messagingService as never,
      prestigeService as never,
      {} as never,
      {} as never,
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
    expect(prestigeService.change).toHaveBeenCalledWith(
      authorId,
      STU_PRESTIGE.HOLONET_POSITIVE_RATING,
      `${STU_PRESTIGE.HOLONET_POSITIVE_RATING} Prestige erhalten für eine positive Holonet-Bewertung`,
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
    expect(prestigeService.change).not.toHaveBeenCalled();
    expect(userRepo.decrement).not.toHaveBeenCalled();
  });

  it('returns positive and total rating counts', async () => {
    ratingRepo.findOne.mockResolvedValue(null);
    ratingRepo.count.mockResolvedValueOnce(3).mockResolvedValueOnce(5);

    const result = await service.findOne(post.id, voterId);

    expect(result).toMatchObject({ positiveCount: 3, totalCount: 5 });
  });

  it('validates comments from 3 to 250 trimmed Unicode code points', async () => {
    postRepo.findOneBy.mockResolvedValue({ ...post, title: 'Titel', commentCount: 0 });

    await expect(service.addComment(post.id, voterId, ' 🚀 ')).rejects.toThrow(
      'Der Kommentar muss 3 bis 250 Zeichen lang sein.',
    );
    await expect(
      service.addComment(post.id, voterId, ` ${'🚀'.repeat(251)} `),
    ).rejects.toThrow('Der Kommentar muss 3 bis 250 Zeichen lang sein.');
    await service.addComment(post.id, voterId, ' 🚀🚀🚀 ');
    expect(commentRepo.create).toHaveBeenCalledWith({
      postId: post.id,
      authorId: voterId,
      body: '🚀🚀🚀',
    });
  });

  it('notifies the post author and each prior commentator once, except the commenter', async () => {
    postRepo.findOneBy.mockResolvedValue({ ...post, title: 'Titel', commentCount: 2 });
    commentRepo.find.mockResolvedValue([
      { authorId: 33 },
      { authorId: 33 },
      { authorId: voterId },
      { authorId },
    ]);
    userRepo.findOneBy.mockResolvedValue({ username: 'Kommentator' });

    await service.addComment(post.id, voterId, 'Guter Kommentar');

    expect(messagingService.sendSystem).toHaveBeenCalledTimes(2);
    expect(messagingService.sendSystem).toHaveBeenCalledWith(
      authorId,
      'Neuer Kommentar auf: Titel',
      expect.stringContaining('Kommentator'),
      undefined,
      undefined,
      { kind: MessageTargetKind.HOLONET_POST, id: post.id },
    );
    expect(messagingService.sendSystem).toHaveBeenCalledWith(
      33,
      'Neuer Kommentar auf: Titel',
      expect.stringContaining('ebenfalls kommentiert'),
      undefined,
      undefined,
      { kind: MessageTargetKind.HOLONET_POST, id: post.id },
    );
  });

  it('soft-deletes comments and keeps visible commentCount consistent', async () => {
    commentRepo.findOne.mockResolvedValue({ id: 9, postId: post.id, authorId: voterId });
    commentRepo.findAndCount.mockResolvedValue([[{ id: 8 }], 1]);
    await service.deleteComment(9, voterId);

    expect(commentRepo.softRemove).toHaveBeenCalled();
    expect(postRepo.update).toHaveBeenCalledWith(post.id, { commentCount: 1 });
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
    expect(prestigeService.change).not.toHaveBeenCalled();
    expect(userRepo.decrement).not.toHaveBeenCalled();
  });
});
