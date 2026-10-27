import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameStatus, GameStatusKind } from './entities/game-status.entity';

export interface GameStatusDto {
  status: GameStatusKind;
  message: string;
}

export type RestorableGameStatus = Exclude<GameStatusKind, 'TICK'>;
export interface PreviousGameStatus {
  status: RestorableGameStatus;
  message: string;
}

const DEFAULT_MESSAGES: Record<Exclude<GameStatusKind, 'ONLINE'>, string> = {
  TICK: 'Der Tick läuft gerade. Bitte versuche es gleich noch einmal.',
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

  async beginMainTick(): Promise<PreviousGameStatus | null> {
    const status = await this.get();
    if (status.status === 'MAINTENANCE' || status.status === 'TICK') return null;
    const previous = { status: status.status, message: status.message };
    status.status = 'TICK';
    status.message = '';
    await this.repository.save(status);
    return previous;
  }

  async endMainTick(previous: PreviousGameStatus): Promise<void> {
    const status = await this.get();
    if (status.status !== 'TICK') return;
    status.status = previous.status;
    status.message = previous.message;
    await this.repository.save(status);
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
