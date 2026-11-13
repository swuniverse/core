import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { HolonetPost } from './holonet-post.entity';

@Entity('holonet_comments')
export class HolonetComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @ManyToOne(() => HolonetPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: HolonetPost;

  /** `null` once the author's account was deleted (sh-AP-05b). */
  @Column({ type: 'int', nullable: true })
  authorId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author: User | null;

  @Column({ length: 250 })
  body: string;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
