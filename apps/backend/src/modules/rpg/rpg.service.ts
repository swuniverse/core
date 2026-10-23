import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SaveUserCharacterDto, UserCharacterDto } from '@swuniverse/shared';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { UserCharacter } from './user-character.entity';

const CHARACTER_LIMIT = 20;
const MAX_AVATAR_BYTES = 250 * 1024;
const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

@Injectable()
export class RpgService {
  constructor(
    @InjectRepository(UserCharacter)
    private readonly characters: Repository<UserCharacter>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async list(userId: number): Promise<UserCharacterDto[]> {
    if (!(await this.users.exist({ where: { id: userId } }))) {
      throw new NotFoundException('Spieler nicht gefunden');
    }
    const characters = await this.characters.find({ where: { userId }, order: { createdAt: 'ASC' } });
    return characters.map((character) => this.toDto(character));
  }

  async create(userId: number, input: SaveUserCharacterDto): Promise<UserCharacterDto> {
    this.validate(input);
    if ((await this.characters.countBy({ userId })) >= CHARACTER_LIMIT) {
      throw new BadRequestException('Du kannst höchstens 20 Charaktere anlegen');
    }
    return this.toDto(await this.characters.save(this.characters.create({ ...input, name: input.name.trim(), avatar: input.avatar ?? null, userId })));
  }

  async update(userId: number, id: number, input: SaveUserCharacterDto): Promise<UserCharacterDto> {
    this.validate(input);
    const character = await this.owned(userId, id);
    character.name = input.name.trim();
    character.description = input.description;
    if (input.avatar !== undefined) character.avatar = input.avatar;
    return this.toDto(await this.characters.save(character));
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.characters.remove(await this.owned(userId, id));
  }

  private async owned(userId: number, id: number): Promise<UserCharacter> {
    const character = await this.characters.findOneBy({ id });
    if (!character) throw new NotFoundException('Charakter nicht gefunden');
    if (character.userId !== userId) throw new ForbiddenException('Kein Zugriff auf diesen Charakter');
    return character;
  }

  private validate(input: SaveUserCharacterDto): void {
    const name = input.name?.trim();
    if (!name || name.length > 60) throw new BadRequestException('Der Charaktername muss 1 bis 60 Zeichen lang sein');
    if (typeof input.description !== 'string' || input.description.length > 5_000) throw new BadRequestException('Die Beschreibung darf höchstens 5.000 Zeichen lang sein');
    if (input.avatar) {
      const match = AVATAR_PATTERN.exec(input.avatar);
      if (!match) throw new BadRequestException('Der Avatar muss PNG, JPEG oder WebP sein');
      const padding = match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0;
      const bytes = Math.floor((match[2].length * 3) / 4) - padding;
      if (bytes > MAX_AVATAR_BYTES) throw new BadRequestException('Der Avatar darf höchstens 250 KB groß sein');
    }
  }

  private toDto(character: UserCharacter): UserCharacterDto {
    return { id: character.id, userId: character.userId, name: character.name, description: character.description, avatar: character.avatar, createdAt: character.createdAt.toISOString(), updatedAt: character.updatedAt.toISOString() };
  }
}
