import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SpaceLocation } from '../../starmap/entities/space-location.entity';

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

  @Column({ type: 'int', nullable: true })
  locationId: number | null;

  @ManyToOne(() => SpaceLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'locationId' })
  location: SpaceLocation | null;

  @CreateDateColumn()
  createdAt: Date;
}
