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
import { MessagingService } from './messaging.service';

@Controller('messages')
@UseGuards(AuthGuard('jwt'))
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

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
}
