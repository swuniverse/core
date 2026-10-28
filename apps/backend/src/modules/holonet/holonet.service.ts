import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, IsNull, MoreThan, Repository } from 'typeorm';
import { HolonetPost, PostCategory } from './entities/holonet-post.entity';
import { HolonetComment } from './entities/holonet-comment.entity';
import { HolonetRating } from './entities/holonet-rating.entity';
import { HolonetCheckpoint } from './entities/holonet-checkpoint.entity';
import { User } from '../auth/user.entity';
import { MessagingService } from '../messaging/messaging.service';
import { STU_PRESTIGE } from '../prestige/prestige.constants';
import { PrestigeService } from '../prestige/prestige.service';
import { RpgPlot } from '../rpg/rpg-plot.entity';
import { RpgPlotMember } from '../rpg/rpg-plot-member.entity';

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
      relations: ['author', 'plot'],
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
          ...post,
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
  ): Promise<HolonetPost & {
    isUnread?: boolean;
    positiveCount: number;
    totalCount: number;
  }> {
    const post = await this.postRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['author', 'plot'],
    });
    if (!post) throw new NotFoundException('Post not found');
    const [positiveCount, totalCount] = await Promise.all([
      this.ratingRepo.count({ where: { postId: id, value: 1 } }),
      this.ratingRepo.count({ where: { postId: id } }),
    ]);
    const result = { ...post, positiveCount, totalCount };
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
  ): Promise<HolonetPost> {
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
    const post = this.postRepo.create({
      authorId,
      title: normalizedTitle,
      body: normalizedBody,
      category: plot ? PostCategory.ROLEPLAY : category,
      ...(plot ? { plotId: plot.id } : {}),
    });
    const saved = await this.postRepo.save(post);
    if (plot) await this.notifyPlotMembers(saved, plot, authorId);
    return saved;
  }

  async update(
    id: number,
    userId: number,
    title: string,
    body: string,
    isAdmin = false,
  ): Promise<HolonetPost> {
    const post = await this.postRepo.findOne({
      where: isAdmin
        ? { id, deletedAt: IsNull() }
        : { id, authorId: userId, deletedAt: IsNull() },
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
    post.title = normalizedTitle;
    post.body = normalizedBody;
    return this.postRepo.save(post);
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
      relations: ['author', 'plot'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
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
    const recipients = new Set([
      post.authorId,
      ...priorComments.map((item) => item.authorId),
    ]);
    recipients.delete(authorId);
    for (const recipientId of recipients) {
      const isAuthor = recipientId === post.authorId;
      await this.messagingService.sendSystem(
        recipientId,
        `Neuer Kommentar auf: ${post.title}`,
        isAuthor
          ? `${commenter?.username || 'Unbekannt'} hat kommentiert: ${normalizedBody}`
          : `${commenter?.username || 'Unbekannt'} hat einen HoloNet-Beitrag ebenfalls kommentiert: ${normalizedBody}`,
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
    if (value === 1) {
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
