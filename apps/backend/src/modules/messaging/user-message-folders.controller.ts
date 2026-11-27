import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { parsePage } from './folder-page';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { UserMessageFoldersService } from './user-message-folders.service';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
class FolderNameDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;
}
type AuthRequest = { user: { sub: number } };
@Controller('messages/user-folders')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class UserMessageFoldersController {
  constructor(private readonly folders: UserMessageFoldersService) {}
  @Get() list(@Request() req: AuthRequest) {
    return this.folders.list(req.user.sub);
  }
  @Post() create(@Request() req: AuthRequest, @Body() dto: FolderNameDto) {
    return this.folders.create(req.user.sub, dto.name);
  }
  @Post('move') move(
    @Request() req: AuthRequest,
    @Body('ids') ids: number[],
    @Body('folderId') folderId: number | null,
  ) {
    return this.folders.move(req.user.sub, ids, folderId);
  }
  @Patch(':id') rename(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FolderNameDto,
  ) {
    return this.folders.rename(req.user.sub, id, dto.name);
  }
  @Delete(':id') remove(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.folders.remove(req.user.sub, id);
  }
  @Post(':id/sort') sort(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('direction') direction: string,
  ) {
    return this.folders.sort(req.user.sub, id, direction);
  }
  @Get(':id/messages') messages(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
  ) {
    return this.folders.messages(req.user.sub, id, parsePage(page));
  }
  @Post(':id/mark-read') read(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.folders.action(req.user.sub, id, false);
  }
  @Post(':id/empty') empty(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.folders.action(req.user.sub, id, true);
  }
}
