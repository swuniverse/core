import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum GameTickType {
  MAIN = 'MAIN',
  BUILDING_COMPLETION = 'BUILDING_COMPLETION',
}

export enum GameTickStatus {
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('game_tick_states')
@Index(['tickType', 'tickNumber'], { unique: true })
export class GameTickState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tickNumber: number;

  @Column({ type: 'varchar' })
  tickType: GameTickType;

  @Column({ type: 'timestamp' })
  scheduledFor: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', default: GameTickStatus.STARTED })
  status: GameTickStatus;

  @Column({ type: 'varchar', nullable: true })
  lockKey: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
