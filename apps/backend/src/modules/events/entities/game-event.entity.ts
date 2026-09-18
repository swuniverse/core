import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum GameEventType {
  SPACECRAFT_DESTROYED = 'SPACECRAFT_DESTROYED',
  HYPERSPACE_INTERCEPTED = 'HYPERSPACE_INTERCEPTED',
  SYSTEM_ENTERED = 'SYSTEM_ENTERED',
}

@Entity('game_events')
@Index(['createdAt'])
@Index(['type', 'createdAt'])
export class GameEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 48 })
  type: GameEventType;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'varchar', length: 12, nullable: true })
  scope: 'GALAXY' | 'SYSTEM' | null;

  @Column({ type: 'int', nullable: true })
  layerId: number | null;

  @Column({ type: 'int', nullable: true })
  systemId: number | null;

  @Column({ type: 'int', nullable: true })
  x: number | null;

  @Column({ type: 'int', nullable: true })
  y: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
