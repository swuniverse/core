import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { HolonetPost, PostCategory } from './entities/holonet-post.entity';
import { HolonetComment } from './entities/holonet-comment.entity';
import { HolonetRating } from './entities/holonet-rating.entity';
import { HolonetCheckpoint } from './entities/holonet-checkpoint.entity';
import { User } from '../auth/user.entity';
import { MessagingService } from '../messaging/messaging.service';

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
  ) {}

  async findAll(category?: PostCategory, page = 1, limit = 20) {
    const where = category ? { category } : {};
    const [data, total] = await this.postRepo.findAndCount({
      where,
      relations: ['author'],
      order: { isPinned: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<HolonetPost> {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(
    authorId: number,
    title: string,
    body: string,
    category: PostCategory,
  ): Promise<HolonetPost> {
    const post = this.postRepo.create({ authorId, title, body, category });
    return this.postRepo.save(post);
  }

  async update(
    id: number,
    userId: number,
    title: string,
    body: string,
  ): Promise<HolonetPost> {
    const post = await this.postRepo.findOne({
      where: { id, authorId: userId },
    });
    if (!post) throw new NotFoundException('Post not found');
    post.title = title;
    post.body = body;
    return this.postRepo.save(post);
  }

  async delete(id: number, userId: number): Promise<void> {
    const post = await this.postRepo.findOne({
      where: { id, authorId: userId },
    });
    if (!post) throw new NotFoundException('Post not found');
    await this.postRepo.remove(post);
  }

  async togglePin(id: number): Promise<HolonetPost> {
    const post = await this.postRepo.findOneBy({ id });
    if (!post) throw new NotFoundException('Post not found');
    post.isPinned = !post.isPinned;
    return this.postRepo.save(post);
  }

  // --- Comments ---

  async getComments(postId: number, page = 1, limit = 20) {
    const [data, total] = await this.commentRepo.findAndCount({
      where: { postId },
      relations: ['author'],
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
    if (!body || body.length > 250) {
      throw new BadRequestException('Comment must be 1-250 characters');
    }

    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('Post not found');

    const comment = this.commentRepo.create({ postId, authorId, body });
    const saved = await this.commentRepo.save(comment);

    post.commentCount += 1;
    await this.postRepo.save(post);

    if (post.authorId !== authorId) {
      const commenter = await this.userRepo.findOneBy({ id: authorId });
      await this.messagingService.sendSystem(
        post.authorId,
        `Neuer Kommentar auf: ${post.title}`,
        `${commenter?.username || 'Unbekannt'} hat kommentiert: ${body}`,
      );
    }

    return saved;
  }

  async deleteComment(commentId: number, userId: number): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, authorId: userId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.commentRepo.remove(comment);

    await this.postRepo.decrement({ id: comment.postId }, 'commentCount', 1);
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

    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('Post not found');

    if (post.authorId === userId) {
      throw new BadRequestException('Cannot rate own post');
    }

    const existing = await this.ratingRepo.findOne({
      where: { postId, userId },
    });

    if (existing) {
      if (existing.value === value) {
        // Remove rating (toggle off)
        await this.ratingRepo.remove(existing);
        post.rating -= value;
        await this.postRepo.save(post);
        await this.userRepo.decrement({ id: post.authorId }, 'prestige', value);
      } else {
        // Flip rating
        const oldValue = existing.value;
        existing.value = value;
        await this.ratingRepo.save(existing);
        post.rating += value - oldValue;
        await this.postRepo.save(post);
        await this.userRepo.increment(
          { id: post.authorId },
          'prestige',
          value - oldValue,
        );
      }
    } else {
      // New rating
      const rating = this.ratingRepo.create({ postId, userId, value });
      await this.ratingRepo.save(rating);
      post.rating += value;
      await this.postRepo.save(post);
      await this.userRepo.increment({ id: post.authorId }, 'prestige', value);
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

  async updateCheckpoint(userId: number): Promise<void> {
    const latest = await this.postRepo.findOne({
      order: { id: 'DESC' },
      select: ['id'],
    });
    if (!latest) return;

    await this.checkpointRepo.upsert({ userId, lastReadPostId: latest.id }, [
      'userId',
    ]);
  }
}
