import {
  Controller,
  Get,
  Post,
  Patch,
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
import { AdminGuard } from '../auth/admin.guard';

@Controller('holonet')
@UseGuards(AuthGuard('jwt'))
export class HolonetController {
  constructor(private readonly holonetService: HolonetService) {}

  @Get()
  findAll(
    @Request() req: { user: { sub: number } },
    @Query('category') category?: PostCategory,
    @Query('page') page?: string,
    @Query('text') text?: string,
    @Query('authorId') authorId?: string,
    @Query('postId') postId?: string,
  ) {
    return this.holonetService.findAll(
      req.user.sub,
      category,
      Number(page) || 1,
      20,
      {
        text: text?.trim() || undefined,
        authorId:
          authorId && Number.isFinite(Number(authorId))
            ? Number(authorId)
            : undefined,
        postId:
          postId && Number.isFinite(Number(postId))
            ? Number(postId)
            : undefined,
      },
    );
  }

  @Get('new-count')
  getNewCount(@Request() req: { user: { sub: number } }) {
    return this.holonetService.getNewCount(req.user.sub);
  }

  @Post('checkpoint')
  updateCheckpoint(
    @Request() req: { user: { sub: number } },
    @Body('postId') postId?: number,
  ) {
    return this.holonetService.updateCheckpoint(req.user.sub, postId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.holonetService.findOne(id, req.user.sub);
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

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('title') title: string,
    @Body('body') body: string,
  ) {
    return this.holonetService.update(id, req.user.sub, title, body);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.holonetService.delete(id, req.user.sub);
  }

  @Patch(':id/pin')
  @UseGuards(AdminGuard)
  togglePin(@Param('id', ParseIntPipe) id: number) {
    return this.holonetService.togglePin(id);
  }

  // --- Comments ---

  @Get(':id/comments')
  getComments(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
  ) {
    return this.holonetService.getComments(id, Number(page) || 1);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('body') body: string,
  ) {
    return this.holonetService.addComment(id, req.user.sub, body);
  }

  @Delete('comments/:id')
  deleteComment(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.holonetService.deleteComment(id, req.user.sub);
  }

  // --- Ratings ---

  @Post(':id/rate')
  rate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('value') value: number,
  ) {
    return this.holonetService.rate(id, req.user.sub, value);
  }

  @Get(':id/my-rating')
  getMyRating(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.holonetService.getUserRating(id, req.user.sub);
  }
}
