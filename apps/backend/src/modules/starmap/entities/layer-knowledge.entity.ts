import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { LayerKnowledgeStatus } from '@swuniverse/shared';
import { User } from '../../auth/user.entity';
import { Layer } from './layer.entity';

@Entity('layer_knowledge')
@Index(['userId', 'status'])
@Index(['layerId', 'status'])
export class LayerKnowledge {
  @PrimaryColumn({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @PrimaryColumn({ type: 'int' })
  layerId: number;

  @ManyToOne(() => Layer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'layerId' })
  layer: Layer;

  @Column({ type: 'varchar', length: 16, default: 'KNOWN' })
  status: LayerKnowledgeStatus;

  @Column({ type: 'timestamp' })
  knownAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  exploredAt: Date | null;
}
