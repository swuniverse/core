import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { Alliance } from './alliance.entity';
import { ForumBoard } from './forum-board.entity';

// The topic list and recent-topics indexes plus length CHECKs live in the
// migration (partial/descending indexes are not expressible here).
@Entity('alliance_forum_topics')
export class ForumTopic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  boardId: number;

  @ManyToOne(() => ForumBoard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boardId' })
  board: ForumBoard;

  /** Denormalised from the board so authorization needs no join. */
  @Column({ type: 'int' })
  allianceId: number;

  @ManyToOne(() => Alliance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'allianceId' })
  alliance: Alliance;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'int', nullable: true })
  authorUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'authorUserId' })
  author: User | null;

  @Column({ type: 'varchar', length: 255 })
  authorName: string;

  @Column({ type: 'boolean', default: false })
  important: boolean;

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
