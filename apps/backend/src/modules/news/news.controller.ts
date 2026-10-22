import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  latest() { return this.newsService.latest(); }

  @Post()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  create(@Request() request: { user: { sub: number } }, @Body() dto: CreateNewsDto) {
    return this.newsService.create(request.user.sub, dto);
  }
}
