import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageTargetKind } from '@swuniverse/shared';
import { FindOptionsWhere, ILike, In, IsNull, MoreThan, Repository } from 'typeorm';
import { HolonetPost, PostCategory } from './entities/holonet-post.entity';
import { HolonetComment } from './entities/holonet-comment.entity';
import { HolonetRating } from './entities/holonet-rating.entity';
import { HolonetCheckpoint } from './entities/holonet-checkpoint.entity';
import { PlotPostRequest, PlotPostRequestStatus } from './entities/plot-post-request.entity';
import { User } from '../auth/user.entity';
import { withDeletedAuthor } from '../account-deletion/deleted-player';
import { MessagingService } from '../messaging/messaging.service';
import { STU_PRESTIGE } from '../prestige/prestige.constants';
import { PrestigeService } from '../prestige/prestige.service';
import { RpgPlot } from '../rpg/rpg-plot.entity';
import { RpgPlotMember } from '../rpg/rpg-plot-member.entity';
import { UserCharacter } from '../rpg/user-character.entity';

type PublicCharacter = Omit<UserCharacter, 'user'> & { user: Pick<User, 'id' | 'username'> };
type PublicHolonetPost = Omit<HolonetPost, 'characters'> & { characters: PublicCharacter[] };

interface HolonetSearchFilters {
  text?: string;
  authorId?: number;
  postId?: number;
  plotId?: number;
}
const HOLONET_EDIT_WINDOW_MS = 10 * 60 * 1000;
const HOLONET_BODY_MAX_LENGTH = 20_000;
const codePointLength = (value: string): number => [...value].length;

@Injectable()
export class HolonetService {
  constructor(
    @InjectRepository(HolonetPost)
    private readonly postRepo: Repository<HolonetPost>,
    @InjectRepository(HolonetComment)
    private readonly commentRepo: Repository<HolonetComment>,
    @InjectRepository(HolonetRating)
    private readonly ratingRepo: Repository<HolonetRating>,
    @InjectRepository(HolonetCheckpoint)
    private readonly checkpointRepo: Repository<HolonetCheckpoint>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly messagingService: MessagingService,
    private readonly prestigeService: PrestigeService,
    @InjectRepository(RpgPlot)
    private readonly plotRepo: Repository<RpgPlot>,
    @InjectRepository(RpgPlotMember)
    private readonly plotMemberRepo: Repository<RpgPlotMember>,
    @InjectRepository(UserCharacter)
    private readonly characterRepo: Repository<UserCharacter>,
    @InjectRepository(PlotPostRequest)
    private readonly plotPostRequestRepo: Repository<PlotPostRequest>,
  ) {}

  async findAll(
    userId: number,
    category?: PostCategory,
    page = 1,
    limit = 20,
    filters: HolonetSearchFilters = {},
  ) {
    const baseWhere: FindOptionsWhere<HolonetPost> = { deletedAt: IsNull() };
    if (category) baseWhere.category = category;
    if (filters.authorId) baseWhere.authorId = filters.authorId;
    if (filters.postId) baseWhere.id = filters.postId;
    if (filters.plotId) baseWhere.plotId = filters.plotId;

    const where = filters.text
      ? [
          { ...baseWhere, title: ILike(`%${filters.text}%`) },
          { ...baseWhere, body: ILike(`%${filters.text}%`) },
        ]
      : baseWhere;

    const [data, total] = await this.postRepo.findAndCount({
      where,
      relations: ['author', 'plot', 'characters', 'characters.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const checkpoint = await this.checkpointRepo.findOneBy({ userId });
    const lastReadPostId = checkpoint?.lastReadPostId ?? 0;
    const unreadCount = await this.postRepo.count({
      where: { id: MoreThan(lastReadPostId), deletedAt: IsNull() },
    });
    const posts = await Promise.all(
      data.map(async (post) => {
        const [positiveCount, totalCount] = await Promise.all([
          this.ratingRepo.count({ where: { postId: post.id, value: 1 } }),
          this.ratingRepo.count({ where: { postId: post.id } }),
        ]);
        return {
          ...this.publicCharacters(post),
          positiveCount,
          totalCount,
          isUnread: post.id > lastReadPostId,
        };
      }),
    );

    return { data: posts, total, page, limit, unreadCount, lastReadPostId };
  }

  async findOne(
    id: number,
    userId?: number,
  ): Promise<PublicHolonetPost & {
    isUnread?: boolean;
    positiveCount: number;
    totalCount: number;
  }> {
    const post = await this.postRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['author', 'plot', 'characters', 'characters.user'],
    });
    if (!post) throw new NotFoundException('Post not found');
    const [positiveCount, totalCount] = await Promise.all([
      this.ratingRepo.count({ where: { postId: id, value: 1 } }),
      this.ratingRepo.count({ where: { postId: id } }),
    ]);
    const result = { ...this.publicCharacters(post), positiveCount, totalCount };
    if (!userId) return result;
    const checkpoint = await this.checkpointRepo.findOneBy({ userId });
    return { ...result, isUnread: post.id > (checkpoint?.lastReadPostId ?? 0) };
  }

  async create(
    authorId: number,
    title: string,
    body: string,
    category: PostCategory,
    plotId?: number,
    characterIds?: number[],
  ): Promise<PublicHolonetPost> {
    const normalizedTitle = title?.trim() ?? '';
    const normalizedBody = body?.trim() ?? '';
    const plot = plotId ? await this.requireActivePlotMember(plotId, authorId) : null;
    if (!plot || normalizedTitle) this.validateTitle(normalizedTitle);
    const bodyLength = codePointLength(normalizedBody);
    if (bodyLength < 50) {
      throw new BadRequestException('Der Text muss mindestens 50 Zeichen lang sein.');
    }
    if (bodyLength > HOLONET_BODY_MAX_LENGTH) {
      throw new BadRequestException('Der Text darf höchstens 20000 Zeichen lang sein.');
    }
    if (!Object.values(PostCategory).includes(category)) {
      throw new BadRequestException('Ungültige HoloNet-Kategorie.');
    }
    const characters = await this.resolveCharacters(characterIds === undefined ? [] : characterIds);
    const post = this.postRepo.create({
      authorId,
      title: normalizedTitle,
      body: normalizedBody,
      category: plot ? PostCategory.ROLEPLAY : category,
      ...(plot ? { plotId: plot.id } : {}),
      ...(characterIds !== undefined ? { characters } : {}),
    });
    const saved = await this.postRepo.save(post);
    if (plot) await this.notifyPlotMembers(saved, plot, authorId);
    await this.notifyCharacterOwners(saved, characters);
    return this.publicCharacters(saved);
  }

  async addPostToPlot(postId: number, requesterId: number, plotId: number) {
    const post = await this.postRepo.findOne({
      where: { id: postId, deletedAt: IsNull() },
    });
    if (!post) throw new NotFoundException('Beitrag nicht gefunden.');
    const plot = await this.requireActivePlotMember(plotId, requesterId);
    if (post.plotId !== null) {
      throw new BadRequestException('Der Beitrag gehört bereits zu einem Plot.');
    }
    if (post.authorId === requesterId) {
      await this.postRepo.manager.transaction(async (manager) => {
        const posts = manager.getRepository(HolonetPost);
        const requests = manager.getRepository(PlotPostRequest);
        const currentPost = await posts.findOne({
          where: { id: postId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!currentPost || currentPost.deletedAt) {
          throw new NotFoundException('Beitrag nicht gefunden.');
        }
        if (currentPost.plotId !== null) {
          throw new BadRequestException('Der Beitrag gehört bereits zu einem Plot.');
        }
        if (currentPost.authorId !== requesterId) {
          throw new ForbiddenException('Nur der Autor kann eigene Beiträge direkt zuordnen.');
        }
        currentPost.plotId = plot.id;
        currentPost.category = PostCategory.ROLEPLAY;
        await posts.save(currentPost);
        await requests.update(
          { postId, status: PlotPostRequestStatus.PENDING },
          { status: PlotPostRequestStatus.CANCELLED },
        );
      });
      return { assigned: true };
    }
    if (post.category !== PostCategory.ROLEPLAY) {
      throw new BadRequestException('Nur ROLEPLAY-Beiträge können einem Plot zugeordnet werden.');
    }
    const authorId = post.authorId;
    if (authorId === null) {
      throw new BadRequestException('Der Autor dieses Beitrags existiert nicht mehr.');
    }

    const existingRequest = await this.plotPostRequestRepo.findOne({
      where: {
        postId,
        plotId,
        status: PlotPostRequestStatus.PENDING,
      },
    });
    if (existingRequest) {
      await this.notifyPlotPostRequestAuthor(
        existingRequest.id,
        existingRequest.requesterId,
        post,
        plot,
      );
      return existingRequest;
    }

    const request = await this.plotPostRequestRepo.save(
      this.plotPostRequestRepo.create({
        postId,
        plotId,
        requesterId,
        authorId,
        status: PlotPostRequestStatus.PENDING,
      }),
    );
    await this.notifyPlotPostRequestAuthor(request.id, requesterId, { ...post, authorId }, plot);
    return request;
  }

  private async notifyPlotPostRequestAuthor(
    requestId: number,
    requesterId: number,
    post: HolonetPost,
    plot: RpgPlot,
  ): Promise<void> {
    if (post.authorId === null) return;
    await this.messagingService.sendSystem(
      post.authorId,
      'Antrag auf RPG-Plot-Zuordnung',
      `Spieler #${requesterId} möchte deinen Beitrag "${post.title}" dem Plot "${plot.title}" zuordnen.`,
      `holonet-plot-post-request:${requestId}:author`,
      undefined,
      { kind: MessageTargetKind.HOLONET_POST, id: post.id },
    );
  }

  private async notifyPlotPostRequestRequester(request: PlotPostRequest): Promise<void> {
    await this.messagingService.sendSystem(
      request.requesterId,
      'RPG-Plot-Antrag angenommen',
      `Dein Antrag für den Beitrag "${request.post.title}" wurde angenommen.`,
      `holonet-plot-post-request:${request.id}:requester`,
      undefined,
      { kind: MessageTargetKind.HOLONET_POST, id: request.postId },
    );
  }

  async getPlotPostRequests(authorId: number) {
    const requests = await this.plotPostRequestRepo.find({
      where: { authorId, status: PlotPostRequestStatus.PENDING, post: { deletedAt: IsNull() } },
      relations: ['post', 'plot', 'requester'],
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return requests.map((request) => ({
      id: request.id,
      postId: request.postId,
      plotId: request.plotId,
      requesterId: request.requesterId,
      post: { id: request.post.id, title: request.post.title },
      plot: { id: request.plot.id, title: request.plot.title },
      requester: { username: request.requester.username },
    }));
  }

  async decidePlotPostRequest(
    requestId: number,
    authorId: number,
    accept: boolean,
  ): Promise<PlotPostRequest> {
    const targetStatus = accept
      ? PlotPostRequestStatus.ACCEPTED
      : PlotPostRequestStatus.REJECTED;
    const result = await this.plotPostRequestRepo.manager.transaction(
      async (manager) => {
        const requests = manager.getRepository(PlotPostRequest);
        const posts = manager.getRepository(HolonetPost);
        const request = await requests.findOne({
          where: { id: requestId },
          relations: ['post'],
          lock: { mode: 'pessimistic_write' },
        });
        if (!request) throw new NotFoundException('Antrag nicht gefunden.');
        if (request.authorId !== authorId) {
          throw new ForbiddenException('Nur der Autor kann über diesen Antrag entscheiden.');
        }
        if (request.status === targetStatus) {
          return { request, changed: false, accepted: accept };
        }
        if (request.status !== PlotPostRequestStatus.PENDING) {
          throw new BadRequestException('Über diesen Antrag wurde bereits entschieden.');
        }

        if (accept) {
          const plot = await this.requireActivePlotMember(request.plotId, request.requesterId);
          const post = await posts.findOne({
            where: { id: request.postId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!post || post.deletedAt) throw new NotFoundException('Beitrag nicht gefunden.');
          if (post.plotId !== null) {
            throw new BadRequestException('Der Beitrag gehört bereits zu einem Plot.');
          }
          if (post.category !== PostCategory.ROLEPLAY || post.authorId !== request.authorId) {
            throw new BadRequestException('Der Beitrag kann diesem Plot nicht zugeordnet werden.');
          }
          post.plotId = plot.id;
          post.category = PostCategory.ROLEPLAY;
          await posts.save(post);
        }

        request.status = targetStatus;
        const saved = await requests.save(request);
        if (accept) {
          await requests.update(
            { postId: request.postId, status: PlotPostRequestStatus.PENDING },
            { status: PlotPostRequestStatus.CANCELLED },
          );
        }
        return { request: saved, changed: true, accepted: accept };
      },
    );
    if (result.accepted) {
      await this.notifyPlotPostRequestRequester(result.request);
    }
    return result.request;
  }

  async update(
    id: number,
    userId: number,
    title: string,
    body: string,
    isAdmin = false,
    characterIds?: number[],
  ): Promise<PublicHolonetPost> {
    const post = await this.postRepo.findOne({
      where: isAdmin
        ? { id, deletedAt: IsNull() }
        : { id, authorId: userId, deletedAt: IsNull() },
      relations: ['characters', 'characters.user'],
    });
    if (!post) throw new NotFoundException('Post not found');
    if (!isAdmin && Date.now() - post.createdAt.getTime() > HOLONET_EDIT_WINDOW_MS) {
      throw new BadRequestException('Dieser Beitrag kann nur 10 Minuten lang bearbeitet werden.');
    }
    const normalizedTitle = title?.trim() ?? '';
    const normalizedBody = body?.trim() ?? '';
    this.validateTitle(normalizedTitle);
    const bodyLength = codePointLength(normalizedBody);
    if (bodyLength < 10) {
      throw new BadRequestException('Der Text muss mindestens 10 Zeichen lang sein.');
    }
    if (bodyLength > HOLONET_BODY_MAX_LENGTH) {
      throw new BadRequestException('Der Text darf höchstens 20000 Zeichen lang sein.');
    }
    const previousIds = new Set((post.characters ?? []).map((character) => character.id));
    const characters = characterIds === undefined ? undefined : await this.resolveCharacters(characterIds);
    post.title = normalizedTitle;
    post.body = normalizedBody;
    if (characters) post.characters = characters;
    const saved = await this.postRepo.save(post);
    if (characters) await this.notifyCharacterOwners(saved, characters.filter((character) => !previousIds.has(character.id)));
    return this.publicCharacters(saved);
  }

  async delete(id: number, userId: number): Promise<void> {
    const post = await this.postRepo.findOne({
      where: { id, authorId: userId, deletedAt: IsNull() },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (Date.now() - post.createdAt.getTime() > HOLONET_EDIT_WINDOW_MS) {
      throw new BadRequestException('Dieser Beitrag kann nur 10 Minuten lang gelöscht werden.');
    }
    await this.postRepo.softRemove(post);
  }

  async adminDelete(id: number, adminId: number, reason?: string): Promise<void> {
    const normalizedReason = reason?.trim() ?? '';
    if (codePointLength(normalizedReason) > 500) {
      throw new BadRequestException('Die Begründung darf höchstens 500 Zeichen lang sein.');
    }

    const [post, admin] = await Promise.all([
      this.postRepo.findOne({ where: { id, deletedAt: IsNull() } }),
      this.userRepo.findOneBy({ id: adminId }),
    ]);
    if (!post) throw new NotFoundException('Post not found');
    if (!admin) throw new NotFoundException('Admin not found');

    await this.postRepo.softRemove(post);
    if (post.authorId === null) return;
    await this.messagingService.sendSystem(
      post.authorId,
      'HoloNet-Beitrag gelöscht',
      `Der HoloNet-Beitrag mit der ID ${post.id} wurde vom Admin ${admin.username} gelöscht.${normalizedReason ? ` Begründung: ${normalizedReason}` : ''}`,
    );
  }

  async togglePin(id: number): Promise<HolonetPost> {
    const post = await this.postRepo.findOneBy({ id, deletedAt: IsNull() });
    if (!post) throw new NotFoundException('Post not found');
    post.isPinned = !post.isPinned;
    return this.postRepo.save(post);
  }

  // --- Comments ---

  async getComments(postId: number, page = 1, limit = 20) {
    const [data, total] = await this.commentRepo.findAndCount({
      where: { postId, deletedAt: IsNull() },
      relations: ['author'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: withDeletedAuthor(data, 'author', 'authorId'), total, page, limit };
  }

  async addComment(
    postId: number,
    authorId: number,
    body: string,
  ): Promise<HolonetComment> {
    const normalizedBody = body?.trim() ?? '';
    const bodyLength = codePointLength(normalizedBody);
    if (bodyLength < 3 || bodyLength > 250) {
      throw new BadRequestException('Der Kommentar muss 3 bis 250 Zeichen lang sein.');
    }

    const post = await this.postRepo.findOneBy({ id: postId, deletedAt: IsNull() });
    if (!post) throw new NotFoundException('Post not found');

    const priorComments = await this.commentRepo.find({
      where: { postId, deletedAt: IsNull() },
      select: ['authorId'],
    });
    const comment = this.commentRepo.create({
      postId,
      authorId,
      body: normalizedBody,
    });
    const saved = await this.commentRepo.save(comment);

    post.commentCount += 1;
    await this.postRepo.save(post);

    const commenter = await this.userRepo.findOneBy({ id: authorId });
    const recipients = new Set(
      [post.authorId, ...priorComments.map((item) => item.authorId)].filter(
        (id): id is number => id !== null,
      ),
    );
    recipients.delete(authorId);
    for (const recipientId of recipients) {
      const isAuthor = recipientId === post.authorId;
      await this.messagingService.sendSystem(
        recipientId,
        `Neuer Kommentar auf: ${post.title}`,
        isAuthor
          ? `${commenter?.username || 'Unbekannt'} hat kommentiert: ${normalizedBody}`
          : `${commenter?.username || 'Unbekannt'} hat einen HoloNet-Beitrag ebenfalls kommentiert: ${normalizedBody}`,
        undefined,
        undefined,
        { kind: MessageTargetKind.HOLONET_POST, id: post.id },
      );
    }

    return saved;
  }

  async deleteComment(commentId: number, userId: number): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, authorId: userId, deletedAt: IsNull() },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.commentRepo.softRemove(comment);
    const [, commentCount] = await this.commentRepo.findAndCount({
      where: { postId: comment.postId, deletedAt: IsNull() },
    });
    await this.postRepo.update(comment.postId, { commentCount });
  }

  // --- Ratings ---

  async rate(
    postId: number,
    userId: number,
    value: number,
  ): Promise<{ rating: number }> {
    if (value !== 1 && value !== -1) {
      throw new BadRequestException('Value must be 1 or -1');
    }

    const post = await this.postRepo.findOneBy({
      id: postId,
      deletedAt: IsNull(),
    });
    if (!post) throw new NotFoundException('Post not found');

    if (post.authorId === userId) {
      throw new BadRequestException('Cannot rate own post');
    }

    const existing = await this.ratingRepo.findOne({
      where: { postId, userId },
    });

    if (existing) {
      throw new BadRequestException('Rating already submitted');
    }

    const rating = this.ratingRepo.create({ postId, userId, value });
    await this.ratingRepo.save(rating);
    post.rating += value;
    await this.postRepo.save(post);
    if (value === 1 && post.authorId !== null) {
      await this.prestigeService.change(
        post.authorId,
        STU_PRESTIGE.HOLONET_POSITIVE_RATING,
        `${STU_PRESTIGE.HOLONET_POSITIVE_RATING} Prestige erhalten für eine positive Holonet-Bewertung`,
      );
    }

    return { rating: post.rating };
  }

  async getUserRating(postId: number, userId: number): Promise<number> {
    const rating = await this.ratingRepo.findOne({ where: { postId, userId } });
    return rating?.value ?? 0;
  }

  // --- Checkpoint ---

  async getNewCount(userId: number): Promise<number> {
    const checkpoint = await this.checkpointRepo.findOneBy({ userId });
    const lastId = checkpoint?.lastReadPostId ?? 0;
    return this.postRepo.count({ where: { id: MoreThan(lastId) } });
  }

  private async resolveCharacters(ids: number[]): Promise<UserCharacter[]> {
    if (!Array.isArray(ids) || ids.length > 10 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new BadRequestException('Es sind höchstens 10 gültige Charakter-IDs erlaubt.');
    }
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return [];
    const characters = await this.characterRepo.find({
      where: { id: In(uniqueIds) },
      relations: ['user'],
    });
    for (const id of uniqueIds) {
      if (!characters.some((character) => character.id === id)) {
        throw new BadRequestException(`Charakter ${id} nicht gefunden.`);
      }
    }
    return characters;
  }

  private publicCharacters(post: HolonetPost): PublicHolonetPost {
    withDeletedAuthor([post], 'author', 'authorId');
    return {
      ...post,
      characters: (post.characters ?? []).map((character) => ({
        ...character,
        user: { id: character.user.id, username: character.user.username },
      })),
    };
  }

  private async notifyCharacterOwners(post: HolonetPost, characters: UserCharacter[]): Promise<void> {
    const owners = new Map<number, UserCharacter>();
    for (const character of characters) {
      if (character.userId !== post.authorId && !owners.has(character.userId)) {
        owners.set(character.userId, character);
      }
    }
    for (const [ownerId, character] of owners) {
      await this.messagingService.sendSystem(
        ownerId,
        'Charakter im HoloNet erwähnt',
        `Dein Charakter ${character.name} wurde im HoloNet-Beitrag ${post.title} erwähnt`,
        `holonet-character:${post.id}:${ownerId}`,
        undefined,
        { kind: MessageTargetKind.HOLONET_POST, id: post.id },
      );
    }
  }

  private async requireActivePlotMember(plotId: number, userId: number): Promise<RpgPlot> {
    const plot = await this.plotRepo.findOne({ where: { id: plotId } });
    if (!plot) throw new BadRequestException('RPG-Plot nicht gefunden.');
    if (plot.endedAt) throw new BadRequestException('Der RPG-Plot ist bereits beendet.');
    if (!(await this.plotMemberRepo.findOneBy({ plotId, userId }))) {
      throw new ForbiddenException('Nur Schreiber dürfen Beiträge zu diesem Plot verfassen.');
    }
    return plot;
  }

  private async notifyPlotMembers(
    post: HolonetPost,
    plot: RpgPlot,
    authorId: number,
  ): Promise<void> {
    const [author, members] = await Promise.all([
      this.userRepo.findOneBy({ id: authorId }),
      this.plotMemberRepo.find({ where: { plotId: plot.id } }),
    ]);
    const text = `Der Spieler ${author?.username ?? `#${authorId}`} hat einen neuen Beitrag zum Plot "${plot.title}" hinzugefügt.`;
    await Promise.all(
      members
        .filter((member) => member.userId !== authorId)
        .map((member) =>
          this.messagingService.sendSystem(
            member.userId,
            'Neuer RPG-Plot-Beitrag',
            text,
            `rpg-plot-post:${post.id}:${member.userId}`,
          ),
        ),
    );
  }

  private validateTitle(title: string): void {
    const length = codePointLength(title);
    if (length < 6 || length > 80) {
      throw new BadRequestException('Der Titel muss 6 bis 80 Zeichen lang sein.');
    }
  }

  async updateCheckpoint(userId: number, postId?: number): Promise<void> {
    const latest = postId
      ? await this.postRepo.findOne({
          where: { id: postId, deletedAt: IsNull() },
          select: ['id'],
        })
      : await this.postRepo.findOne({
          where: { deletedAt: IsNull() },
          order: { id: 'DESC' },
          select: ['id'],
        });
    if (!latest) throw new NotFoundException('Post not found');

    await this.checkpointRepo.upsert({ userId, lastReadPostId: latest.id }, [
      'userId',
    ]);
  }
}
