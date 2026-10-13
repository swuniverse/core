import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { MessagingService } from './messaging.service';
import { MessageFolder, MESSAGE_FOLDERS } from './message-folder';

@Controller('messages')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('folders')
  folders(@Request() req: { user: { sub: number } }) {
    return this.messagingService.getFolderSummary(req.user.sub);
  }

  @Post('folders/:folder/mark-read')
  markFolderRead(
    @Param('folder') folder: string,
    @Request() req: { user: { sub: number } },
  ) {
    return this.messagingService.markFolderRead(
      req.user.sub,
      this.parseIncomingFolder(folder),
    );
  }

  @Post('folders/:folder/empty')
  emptyFolder(
    @Param('folder') folder: string,
    @Request() req: { user: { sub: number } },
  ) {
    return this.messagingService.emptyFolder(
      req.user.sub,
      this.parseIncomingFolder(folder),
    );
  }

  @Post('bulk-delete')
  bulkDelete(
    @Body('ids') ids: unknown,
    @Request() req: { user: { sub: number } },
  ) {
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.some((id) => !Number.isInteger(id) || id < 1)
    ) {
      throw new BadRequestException('Message ids must be positive integers');
    }
    return this.messagingService.bulkDelete(req.user.sub, ids);
  }

  @Get('folders/:folder')
  folder(
    @Param('folder') folder: string,
    @Request() req: { user: { sub: number } },
    @Query('page') page?: string,
  ) {
    return this.messagingService.getFolder(
      req.user.sub,
      this.parseFolder(folder),
      Number(page) || 1,
    );
  }

  @Get('inbox')
  inbox(
    @Request() req: { user: { sub: number } },
    @Query('page') page?: string,
  ) {
    return this.messagingService.getInbox(req.user.sub, Number(page) || 1);
  }

  @Get('sent')
  sent(
    @Request() req: { user: { sub: number } },
    @Query('page') page?: string,
  ) {
    return this.messagingService.getSent(req.user.sub, Number(page) || 1);
  }

  @Get('unread')
  unread(@Request() req: { user: { sub: number } }) {
    return this.messagingService.getUnreadCount(req.user.sub);
  }

  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.messagingService.getOne(id, req.user.sub);
  }

  @Post()
  send(
    @Request() req: { user: { sub: number } },
    @Body('recipientId') recipientId: number,
    @Body('subject') subject: string,
    @Body('body') body: string,
  ) {
    return this.messagingService.send(req.user.sub, recipientId, subject, body);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.messagingService.delete(id, req.user.sub);
  }

  private parseFolder(folder: string): MessageFolder {
    const parsedFolder = folder.toUpperCase() as MessageFolder;
    if (!MESSAGE_FOLDERS.includes(parsedFolder)) {
      throw new BadRequestException('Unknown message folder');
    }
    return parsedFolder;
  }

  private parseIncomingFolder(folder: string): Exclude<MessageFolder, MessageFolder.OUTBOX> {
    const parsedFolder = this.parseFolder(folder);
    if (parsedFolder === MessageFolder.OUTBOX) {
      throw new BadRequestException('Outbox does not support folder actions');
    }
    return parsedFolder;
  }
}
