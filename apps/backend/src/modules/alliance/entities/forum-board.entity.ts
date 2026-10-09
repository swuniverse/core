import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { Alliance } from './alliance.entity';

// CHECK constraints on name length live in the migration.
@Entity('alliance_forum_boards')
@Index('IDX_alliance_forum_boards_alliance', ['allianceId', 'id'])
export class ForumBoard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  allianceId: number;

  @ManyToOne(() => Alliance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'allianceId' })
  alliance: Alliance;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'now()' })
  lastActivityAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  deletedByUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'deletedByUserId' })
  deletedBy: User | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deletedByName: string | null;
}
