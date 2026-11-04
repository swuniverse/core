import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  type CreateContactDto,
  type DeleteContactsDto,
  type UpdateContactCommentDto,
  type UpdateContactModeDto,
  type UpdateContactPermissionsDto,
} from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { ContactService } from './contact.service';

@Controller('contacts')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class ContactController {
  constructor(private readonly contacts: ContactService) {}

  @Get()
  list(@Request() req: { user: { sub: number } }) {
    return this.contacts.list(req.user.sub);
  }

  @Get('received')
  listReceived(@Request() req: { user: { sub: number } }) {
    return this.contacts.listReceived(req.user.sub);
  }

  @Post()
  create(
    @Request() req: { user: { sub: number } },
    @Body() body: CreateContactDto,
  ) {
    return this.contacts.create(req.user.sub, body);
  }

  @Patch(':id/mode')
  updateMode(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateContactModeDto,
  ) {
    return this.contacts.updateMode(req.user.sub, id, body.mode);
  }

  @Patch(':id/comment')
  updateComment(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateContactCommentDto,
  ) {
    return this.contacts.updateComment(req.user.sub, id, body.comment);
  }

  @Patch(':id/permissions')
  updatePermissions(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateContactPermissionsDto,
  ) {
    return this.contacts.updatePermissions(req.user.sub, id, body);
  }

  @Delete()
  removeSelected(
    @Request() req: { user: { sub: number } },
    @Body() body: DeleteContactsDto,
  ) {
    return this.contacts.removeSelected(req.user.sub, body.ids);
  }

  @Delete('all')
  removeAll(@Request() req: { user: { sub: number } }) {
    return this.contacts.removeAll(req.user.sub);
  }
}
