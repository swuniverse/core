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
jest.mock('./entities/plot-post-request.entity', () => ({
  PlotPostRequest: class PlotPostRequest {},
  PlotPostRequestStatus: {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
  },
}), { virtual: true });
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
  let post: { id: number; authorId: number; rating: number; category?: string; plotId?: number | null };
  let postRepo: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    manager: {
      transaction: jest.Mock;
    };
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
  let plotRepo: { findOne: jest.Mock };
  let plotMemberRepo: { findOneBy: jest.Mock };
  let requestRepo: {
    manager: {
      transaction: jest.Mock;
    };
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let service: HolonetService;

  beforeEach(() => {
    post = { id: 1, authorId, rating: 0 };
    postRepo = {
      findOne: jest.fn().mockResolvedValue(post),
      findOneBy: jest.fn().mockResolvedValue(post),
      save: jest.fn().mockImplementation(async (value) => value),
      update: jest.fn().mockResolvedValue(undefined),
      manager: {
        transaction: jest.fn(async (callback) => callback({
          getRepository: (entity) => entity.name === 'PlotPostRequest'
            ? requestRepo
            : postRepo,
        })),
      },
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
    plotRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 4, title: 'Testplot', endedAt: null }),
    };
    plotMemberRepo = { findOneBy: jest.fn().mockResolvedValue({ plotId: 4, userId: voterId }) };
    requestRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => ({ id: 51, ...value })),
      update: jest.fn().mockResolvedValue(undefined),
      manager: {
        transaction: jest.fn(async (callback) => callback({
          getRepository: (entity) => entity.name === 'PlotPostRequest'
            ? requestRepo
            : postRepo,
        })),
      },
    };
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
      plotRepo as never,
      plotMemberRepo as never,
      {} as never,
      requestRepo as never,
    );
  });

  it('converts a member’s own post to ROLEPLAY when assigning it to a plot', async () => {
    const ownPost = {
      id: 1,
      authorId: voterId,
      category: 'NEWS',
      plotId: null,
      title: 'Eigener Beitrag',
    };
    postRepo.findOne.mockResolvedValue(ownPost);

    await service.addPostToPlot(ownPost.id, voterId, 4);

    expect(postRepo.save).toHaveBeenCalledWith({
      ...ownPost,
      category: 'ROLEPLAY',
      plotId: 4,
    });
  });

  it('rejects direct assignment when the post becomes assigned before it is locked', async () => {
    const assignedPost = { id: 1, authorId: voterId, category: 'ROLEPLAY', plotId: 8 };
    postRepo.manager.transaction.mockImplementation(async (callback) => callback({
      getRepository: (entity) => entity.name === 'PlotPostRequest'
        ? requestRepo
        : {
            findOne: jest.fn().mockResolvedValue(assignedPost),
            save: postRepo.save,
          },
    }));

    await expect(service.addPostToPlot(1, voterId, 4)).rejects.toThrow(
      'Der Beitrag gehört bereits zu einem Plot.',
    );

    expect(postRepo.save).not.toHaveBeenCalled();
  });

  it('retries the author notification for an existing pending request', async () => {
    const existing = { id: 51, status: 'PENDING', requesterId: voterId };
    const foreignPost = {
      id: 1,
      authorId,
      category: 'ROLEPLAY',
      plotId: null,
      title: 'Fremder Beitrag',
    };
    postRepo.findOne.mockResolvedValue(foreignPost);
    plotRepo.findOne.mockResolvedValue({ id: 4, title: 'Testplot', endedAt: null });
    requestRepo.findOne.mockResolvedValue(existing);

    await expect(service.addPostToPlot(1, voterId, 4)).resolves.toBe(existing);

    expect(requestRepo.save).not.toHaveBeenCalled();
    expect(messagingService.sendSystem).toHaveBeenCalledWith(
      authorId,
      'Antrag auf RPG-Plot-Zuordnung',
      expect.stringContaining('Fremder Beitrag'),
      'holonet-plot-post-request:51:author',
      undefined,
      { kind: MessageTargetKind.HOLONET_POST, id: foreignPost.id },
    );
  });

  it('rejects foreign posts that are not ROLEPLAY before creating a request', async () => {
    postRepo.findOne.mockResolvedValue({
      id: 1,
      authorId,
      category: 'NEWS',
      plotId: null,
      title: 'Fremder Beitrag',
    });

    await expect(service.addPostToPlot(1, voterId, 4)).rejects.toThrow(
      'Nur ROLEPLAY-Beiträge können einem Plot zugeordnet werden.',
    );

    expect(requestRepo.save).not.toHaveBeenCalled();
    expect(messagingService.sendSystem).not.toHaveBeenCalled();
  });

  it('creates one durable request and notifies a foreign post author', async () => {
    const foreignPost = {
      id: 1,
      authorId,
      category: 'ROLEPLAY',
      plotId: null,
      title: 'Fremder Beitrag',
    };
    const savedRequest = {
      id: 51,
      postId: foreignPost.id,
      plotId: 4,
      requesterId: voterId,
      authorId,
      status: 'PENDING',
    };
    postRepo.findOne.mockResolvedValue(foreignPost);
    requestRepo.save.mockResolvedValue(savedRequest);

    const result = await service.addPostToPlot(foreignPost.id, voterId, 4);

    expect(result).toMatchObject(savedRequest);
    expect(requestRepo.create).toHaveBeenCalledWith({
      postId: foreignPost.id,
      plotId: 4,
      requesterId: voterId,
      authorId,
      status: 'PENDING',
    });
    expect(requestRepo.save).toHaveBeenCalledTimes(1);
    expect(messagingService.sendSystem).toHaveBeenCalledWith(
      authorId,
      'Antrag auf RPG-Plot-Zuordnung',
      expect.stringContaining('Fremder Beitrag'),
      'holonet-plot-post-request:51:author',
      undefined,
      { kind: MessageTargetKind.HOLONET_POST, id: foreignPost.id },
    );
    expect(postRepo.save).not.toHaveBeenCalled();
  });

  it('lists only pending requests for the authenticated post author', async () => {
    const pendingRequest = {
      id: 51,
      postId: 1,
      plotId: 4,
      requesterId: voterId,
      authorId,
      status: 'PENDING',
      post: { id: 1, title: 'Fremder Beitrag' },
      plot: { id: 4, title: 'Testplot' },
      requester: { id: voterId, username: 'Kommentator' },
    };
    requestRepo.find.mockResolvedValue([pendingRequest]);

    await expect(service.getPlotPostRequests(authorId)).resolves.toEqual([{
      id: 51,
      postId: 1,
      plotId: 4,
      requesterId: voterId,
      post: { id: 1, title: 'Fremder Beitrag' },
      plot: { id: 4, title: 'Testplot' },
      requester: { username: 'Kommentator' },
    }]);

    expect(requestRepo.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { authorId, status: 'PENDING', post: { deletedAt: expect.anything() } },
      relations: ['post', 'plot', 'requester'],
    }));
  });

  it('retries the requester notification for an already accepted request', async () => {
    const alreadyAccepted = {
      id: 51,
      authorId,
      requesterId: voterId,
      status: 'ACCEPTED',
      postId: 1,
      post: { id: 1, title: 'Fremder Beitrag' },
    };
    requestRepo.findOne.mockResolvedValue(alreadyAccepted);

    await service.decidePlotPostRequest(51, authorId, true);

    expect(messagingService.sendSystem).toHaveBeenCalledWith(
      voterId,
      'RPG-Plot-Antrag angenommen',
      expect.stringContaining('Fremder Beitrag'),
      'holonet-plot-post-request:51:requester',
      undefined,
      { kind: MessageTargetKind.HOLONET_POST, id: 1 },
    );
  });

  it('keeps accepted and rejected request transitions idempotent', async () => {
    const accepted = {
      id: 51,
      authorId,
      requesterId: voterId,
      postId: 1,
      status: 'ACCEPTED',
      post: { id: 1, title: 'Fremder Beitrag' },
    };
    const rejected = {
      id: 52,
      authorId,
      requesterId: voterId,
      postId: 2,
      status: 'REJECTED',
      post: { id: 2, title: 'Anderer Beitrag' },
    };
    requestRepo.findOne.mockResolvedValueOnce(accepted).mockResolvedValueOnce(rejected);

    await expect(service.decidePlotPostRequest(51, authorId, true)).resolves.toBe(accepted);
    await expect(service.decidePlotPostRequest(52, authorId, false)).resolves.toBe(rejected);

    expect(requestRepo.save).not.toHaveBeenCalled();
    expect(postRepo.save).not.toHaveBeenCalled();
    expect(messagingService.sendSystem).toHaveBeenCalledTimes(1);
  });

  it('accepts a pending request, assigns the post, and notifies the requester once', async () => {
    const plot = { id: 4, title: 'Testplot', endedAt: null };
    plotRepo.findOne.mockResolvedValue(plot);
    plotMemberRepo.findOneBy.mockResolvedValue({ plotId: 4, userId: voterId });
    const acceptedPost = {
      id: 1,
      authorId,
      category: 'ROLEPLAY',
      plotId: null,
      title: 'Fremder Beitrag',
    };
    postRepo.findOne.mockResolvedValue(acceptedPost);
    const request = {
      id: 51,
      authorId,
      requesterId: voterId,
      postId: 1,
      plotId: 4,
      status: 'PENDING',
      post: { title: 'Fremder Beitrag' },
    };
    requestRepo.findOne.mockResolvedValue(request);

    const result = await service.decidePlotPostRequest(51, authorId, true);

    expect(result.status).toBe('ACCEPTED');
    expect(postRepo.save).toHaveBeenCalledWith({
      ...acceptedPost,
      category: 'ROLEPLAY',
      plotId: 4,
    });
    expect(requestRepo.save).toHaveBeenCalledWith(request);
    expect(request.status).toBe('ACCEPTED');
    expect(messagingService.sendSystem).toHaveBeenCalledWith(
      voterId,
      'RPG-Plot-Antrag angenommen',
      expect.stringContaining('Fremder Beitrag'),
      'holonet-plot-post-request:51:requester',
      undefined,
      { kind: MessageTargetKind.HOLONET_POST, id: 1 },
    );
  });

  it('rejects requests for ended plots and posts that already belong to a plot', async () => {
    const eligiblePost = {
      id: 1,
      authorId,
      category: 'ROLEPLAY',
      plotId: null,
      title: 'Fremder Beitrag',
    };
    postRepo.findOne.mockResolvedValue(eligiblePost);
    plotRepo.findOne.mockResolvedValueOnce({ id: 4, title: 'Testplot', endedAt: new Date() });
    await expect(service.addPostToPlot(1, voterId, 4)).rejects.toThrow('bereits beendet');

    plotRepo.findOne.mockResolvedValue({ id: 4, title: 'Testplot', endedAt: null });
    postRepo.findOne.mockResolvedValue({ ...eligiblePost, plotId: 8 });
    await expect(service.addPostToPlot(1, voterId, 4)).rejects.toThrow('gehört bereits zu einem Plot');

    expect(requestRepo.save).not.toHaveBeenCalled();
  });

  it('cannot accept a request after its plot has ended', async () => {
    const request = {
      id: 51,
      authorId,
      requesterId: voterId,
      postId: 1,
      plotId: 4,
      status: 'PENDING',
      post: { title: 'Fremder Beitrag' },
    };
    plotRepo.findOne.mockResolvedValue({ id: 4, title: 'Testplot', endedAt: new Date() });
    requestRepo.findOne.mockResolvedValue(request);

    await expect(service.decidePlotPostRequest(51, authorId, true)).rejects.toThrow('bereits beendet');

    expect(postRepo.save).not.toHaveBeenCalled();
    expect(requestRepo.save).not.toHaveBeenCalled();
    expect(messagingService.sendSystem).not.toHaveBeenCalled();
  });

  it('rejects a pending request without assigning the post', async () => {
    const request = {
      id: 51,
      authorId,
      requesterId: voterId,
      postId: 1,
      plotId: 4,
      status: 'PENDING',
      post: { title: 'Fremder Beitrag' },
    };
    requestRepo.findOne.mockResolvedValue(request);

    const result = await service.decidePlotPostRequest(51, authorId, false);

    expect(result.status).toBe('REJECTED');
    expect(requestRepo.save).toHaveBeenCalledWith(request);
    expect(postRepo.save).not.toHaveBeenCalled();
    expect(messagingService.sendSystem).not.toHaveBeenCalled();
  });

  it('only the post author can accept or reject a request', async () => {
    requestRepo.findOne.mockResolvedValue({
      id: 51,
      authorId,
      requesterId: voterId,
      postId: 1,
      plotId: 4,
      status: 'PENDING',
      post: { title: 'Fremder Beitrag' },
    });

    await expect(service.decidePlotPostRequest(51, voterId, true)).rejects.toThrow(
      'Nur der Autor kann über diesen Antrag entscheiden.',
    );

    expect(postRepo.save).not.toHaveBeenCalled();
    expect(requestRepo.save).not.toHaveBeenCalled();
    expect(messagingService.sendSystem).not.toHaveBeenCalled();
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
