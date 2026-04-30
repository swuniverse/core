import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HolonetPost, PostCategory } from './entities/holonet-post.entity';

@Injectable()
export class HolonetService {
  constructor(
    @InjectRepository(HolonetPost)
    private readonly postRepo: Repository<HolonetPost>,
  ) {}

  async findAll(category?: PostCategory, page = 1, limit = 20) {
    const where = category ? { category } : {};
    const [data, total] = await this.postRepo.findAndCount({
      where,
      relations: ['author'],
      order: { createdAt: 'DESC' },
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

  async delete(id: number, userId: number): Promise<void> {
    const post = await this.postRepo.findOne({ where: { id, authorId: userId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.postRepo.remove(post);
  }
}
