import { Injectable, NotFoundException } from '@nestjs/common';
import type { NoteDto, SaveNoteRequest } from '@swuniverse/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Note } from './entities/note.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note) private readonly noteRepo: Repository<Note>,
  ) {}

  async list(userId: number): Promise<NoteDto[]> {
    const notes = await this.noteRepo.find({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return notes.map((note) => this.toDto(note));
  }

  async get(userId: number, id: number): Promise<NoteDto> {
    const note = await this.noteRepo.findOneBy({ userId, id });
    if (!note) throw new NotFoundException('Note not found');
    return this.toDto(note);
  }

  async create(userId: number, input: SaveNoteRequest): Promise<NoteDto> {
    const note = await this.noteRepo.save(
      this.noteRepo.create({ userId, title: input.title, text: input.text }),
    );
    return this.toDto(note);
  }

  async update(
    userId: number,
    id: number,
    input: SaveNoteRequest,
  ): Promise<NoteDto> {
    const result = await this.noteRepo.update(
      { userId, id },
      { title: input.title, text: input.text },
    );
    if (!result.affected) throw new NotFoundException('Note not found');
    return this.get(userId, id);
  }

  async delete(userId: number, id: number) {
    const result = await this.noteRepo.delete({ userId, id });
    if (!result.affected) throw new NotFoundException('Note not found');
    return { deleted: result.affected };
  }

  async deleteMany(userId: number, ids: number[]) {
    const result = await this.noteRepo.delete({ userId, id: In(ids) });
    return { deleted: result.affected ?? 0 };
  }

  private toDto(note: Note): NoteDto {
    return {
      id: note.id,
      title: note.title,
      text: note.text,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}
