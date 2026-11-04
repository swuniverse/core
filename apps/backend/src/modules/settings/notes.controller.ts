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
import { DeleteNotesDto, SaveNoteDto } from './dto/note.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { NotesService } from './notes.service';

@Controller('user/notes')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(
    @Request() req: { user: { sub: number } },
    @Body() input: SaveNoteDto,
  ) {
    return this.notesService.create(req.user.sub, input);
  }

  @Patch(':id')
  update(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() input: SaveNoteDto,
  ) {
    return this.notesService.update(req.user.sub, id, input);
  }

  @Get(':id')
  get(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notesService.get(req.user.sub, id);
  }

  @Delete(':id')
  delete(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notesService.delete(req.user.sub, id);
  }

  @Delete()
  deleteMany(
    @Request() req: { user: { sub: number } },
    @Body() input: DeleteNotesDto,
  ) {
    return this.notesService.deleteMany(req.user.sub, input.ids);
  }

  @Get()
  list(@Request() req: { user: { sub: number } }) {
    return this.notesService.list(req.user.sub);
  }
}
