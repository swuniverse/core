import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { DatabaseCategoryProgressDto } from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { DatabaseCompletionService } from './database-completion.service';

@Controller('database')
export class DatabaseProgressController {
  constructor(private readonly completion: DatabaseCompletionService) {}

  /** Award progress per database category (star systems per layer). */
  @Get('category-progress')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  categoryProgress(
    @Request() req: { user: { sub: number } },
  ): Promise<DatabaseCategoryProgressDto[]> {
    return this.completion.progress(req.user.sub);
  }
}
