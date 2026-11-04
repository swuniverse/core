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
import { Transform } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';
import type { SendMessageDto as SharedSendMessageDto } from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { MessagingService } from './messaging.service';
import { MessageFolder, MESSAGE_FOLDERS } from './message-folder';

export class SendMessageDto implements SharedSendMessageDto {
  @IsInt({ message: 'Der Empfänger muss eine positive Ganzzahl sein' })
  @Min(1, { message: 'Der Empfänger muss eine positive Ganzzahl sein' })
  recipientId: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Der Betreff muss Text sein' })
  @MaxLength(255, {
    message: 'Der Betreff darf höchstens 255 Zeichen lang sein',
  })
  subject: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Die Nachricht muss Text sein' })
  @MinLength(5, {
    message: 'Die Nachricht muss mindestens 5 Zeichen lang sein',
  })
  @MaxLength(10_000, {
    message: 'Die Nachricht darf höchstens 10.000 Zeichen lang sein',
  })
  body: string;
}

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

  @Get('conversations')
  conversations(
    @Request() req: { user: { sub: number } },
    @Query('page') page?: string,
  ) {
    return this.messagingService.getConversations(
      req.user.sub,
      Number(page) || 1,
    );
  }

  @Get('correspondence/:partnerId')
  correspondence(
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.messagingService.getCorrespondence(req.user.sub, partnerId, 10);
  }

  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.messagingService.getOne(id, req.user.sub);
  }

  @Post()
  send(@Request() req: { user: { sub: number } }, @Body() dto: SendMessageDto) {
    return this.messagingService.send(
      req.user.sub,
      dto.recipientId,
      dto.subject,
      dto.body,
    );
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

  private parseIncomingFolder(
    folder: string,
  ): Exclude<MessageFolder, MessageFolder.OUTBOX> {
    const parsedFolder = this.parseFolder(folder);
    if (parsedFolder === MessageFolder.OUTBOX) {
      throw new BadRequestException('Outbox does not support folder actions');
    }
    return parsedFolder;
  }
}
