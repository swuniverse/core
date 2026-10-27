import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type {
  CreateIgnoreListEntryDto,
  DeleteIgnoreListEntriesDto,
} from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { IgnoreListService } from './ignore-list.service';

@Controller('ignore-list')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class IgnoreListController {
  constructor(private readonly ignoreList: IgnoreListService) {}

  @Get()
  list(@Request() req: { user: { sub: number } }) {
    return this.ignoreList.list(req.user.sub);
  }

  @Get('ignored-by')
  listIgnoredBy(@Request() req: { user: { sub: number } }) {
    return this.ignoreList.listIgnoredBy(req.user.sub);
  }

  @Post()
  create(
    @Request() req: { user: { sub: number } },
    @Body() body: CreateIgnoreListEntryDto,
  ) {
    return this.ignoreList.create(req.user.sub, body.playerId);
  }

  @Delete()
  removeSelected(
    @Request() req: { user: { sub: number } },
    @Body() body: DeleteIgnoreListEntriesDto,
  ) {
    return this.ignoreList.removeSelected(req.user.sub, body.ids);
  }

  @Delete('all')
  removeAll(@Request() req: { user: { sub: number } }) {
    return this.ignoreList.removeAll(req.user.sub);
  }
}
