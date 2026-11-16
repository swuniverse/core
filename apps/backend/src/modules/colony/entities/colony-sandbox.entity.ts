import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ColonySandboxSnapshotDto } from '@swuniverse/shared';
import { User } from '../../auth/user.entity';
import { Colony } from './colony.entity';

@Entity('colony_sandboxes')
@Index(['userId'])
export class ColonySandbox {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', nullable: true })
  sourceColonyId: number | null;

  @ManyToOne(() => Colony, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sourceColonyId' })
  sourceColony: Colony | null;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'jsonb' })
  snapshot: ColonySandboxSnapshotDto;

  @CreateDateColumn()
  createdAt: Date;
}
