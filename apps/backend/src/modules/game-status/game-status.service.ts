import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameStatus, GameStatusKind } from './entities/game-status.entity';

export interface GameStatusDto {
  status: GameStatusKind;
  message: string;
}

const DEFAULT_MESSAGES: Record<Exclude<GameStatusKind, 'ONLINE'>, string> = {
  MAINTENANCE_ANNOUNCED: 'Eine Wartung des Spiels ist angekündigt.',
  MAINTENANCE: 'Das Spiel befindet sich derzeit in Wartung.',
};

@Injectable()
export class GameStatusService {
  constructor(
    @InjectRepository(GameStatus)
    private readonly repository: Repository<GameStatus>,
  ) {}

  async getPublicStatus(): Promise<GameStatusDto> {
    const status = await this.get();
    return this.toDto(status);
  }

  async isMaintenance(): Promise<boolean> {
    return (await this.get()).status === 'MAINTENANCE';
  }

  async update(input: {
    status: GameStatusKind;
    message?: string;
  }): Promise<GameStatusDto> {
    const status = await this.get();
    status.status = input.status;
    status.message = input.message?.trim() ?? '';
    return this.toDto(await this.repository.save(status));
  }

  private async get(): Promise<GameStatus> {
    let status = await this.repository.findOneBy({ id: 1 });
    if (!status) {
      status = await this.repository.save(
        this.repository.create({ id: 1, status: 'ONLINE', message: '' }),
      );
    }
    return status;
  }

  private toDto(status: GameStatus): GameStatusDto {
    return {
      status: status.status,
      message:
        status.message ||
        (status.status === 'ONLINE' ? '' : DEFAULT_MESSAGES[status.status]),
    };
  }
}
