import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HolonetService } from './holonet.service';
import { PostCategory } from './entities/holonet-post.entity';

@Controller('holonet')
@UseGuards(AuthGuard('jwt'))
export class HolonetController {
  constructor(private readonly holonetService: HolonetService) {}

  @Get()
  findAll(
    @Query('category') category?: PostCategory,
    @Query('page') page?: string,
  ) {
    return this.holonetService.findAll(category, Number(page) || 1);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.holonetService.findOne(id);
  }

  @Post()
  create(
    @Request() req: { user: { sub: number } },
    @Body('title') title: string,
    @Body('body') body: string,
    @Body('category') category: PostCategory,
  ) {
    return this.holonetService.create(req.user.sub, title, body, category);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.holonetService.delete(id, req.user.sub);
  }
}
