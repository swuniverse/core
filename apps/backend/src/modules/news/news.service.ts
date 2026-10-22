import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNewsDto } from './dto/create-news.dto';
import { News } from './entities/news.entity';

export type PublicNewsDto = { id: number; title: string; renderedText: string; links: string[]; isChangelog: boolean; createdAt: string };

@Injectable()
export class NewsService {
  constructor(@InjectRepository(News) private readonly newsRepo: Repository<News>) {}

  async create(authorId: number, dto: CreateNewsDto): Promise<PublicNewsDto> {
    const news = await this.newsRepo.save(this.newsRepo.create({ ...dto, authorId, links: dto.links.filter(isSafeHttpUrl) }));
    return this.toPublicDto(news);
  }

  async latest(): Promise<PublicNewsDto[]> {
    const news = await this.newsRepo.find({ order: { createdAt: 'DESC', id: 'DESC' }, take: 5 });
    return news.map((item) => this.toPublicDto(item));
  }

  private toPublicDto(news: News): PublicNewsDto {
    return { id: news.id, title: news.title, renderedText: renderBbCode(news.text), links: news.links.filter(isSafeHttpUrl), isChangelog: news.isChangelog, createdAt: news.createdAt.toISOString() };
  }
}

function isSafeHttpUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; }
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function renderBbCode(value: string): string {
  let result = escapeHtml(value);
  result = result.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');
  result = result.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');
  result = result.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>');
  result = result.replace(/\r?\n/g, '<br>');
  return result;
}
