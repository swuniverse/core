import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
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

  @Column()
  authorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ length: 250 })
  body: string;

  @CreateDateColumn()
  createdAt: Date;
}
