import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { HolonetPost } from './holonet-post.entity';

@Entity('holonet_ratings')
@Unique(['postId', 'userId'])
export class HolonetRating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @ManyToOne(() => HolonetPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: HolonetPost;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  value: number;

  @CreateDateColumn()
  createdAt: Date;
}
