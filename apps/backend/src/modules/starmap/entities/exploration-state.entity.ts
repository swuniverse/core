import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ExplorationLevel {
  TERRAIN = 'TERRAIN',
  FULL = 'FULL',
}

@Entity('exploration_states')
@Index(['userId', 'layerId', 'cx', 'cy'], { unique: true })
@Index(['userId', 'layerId'])
export class ExplorationState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  layerId: number;

  @Column()
  cx: number;

  @Column()
  cy: number;

  @Column({ type: 'varchar', length: 16, default: ExplorationLevel.TERRAIN })
  explorationLevel: ExplorationLevel;

  @Column({ type: 'varchar', length: 64, nullable: true })
  discoverySource: string | null;

  @CreateDateColumn()
  discoveredAt: Date;
}
