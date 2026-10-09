import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { ForumTopic } from './forum-topic.entity';

// The page index and text-length CHECK live in the migration.
@Entity('alliance_forum_posts')
export class ForumPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  topicId: number;

  @ManyToOne(() => ForumTopic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'topicId' })
  topic: ForumTopic;

  @Column({ type: 'int', nullable: true })
  authorUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'authorUserId' })
  author: User | null;

  @Column({ type: 'varchar', length: 255 })
  authorName: string;

  /** Emptied when the post is moderated. */
  @Column({ type: 'text', default: '' })
  text: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date | null;

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
