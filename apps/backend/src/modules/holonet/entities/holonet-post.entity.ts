import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/user.entity';

export enum PostCategory {
  NEWS = 'NEWS',
  ROLEPLAY = 'ROLEPLAY',
  TRADE = 'TRADE',
  RECRUITMENT = 'RECRUITMENT',
}

@Entity('holonet_posts')
@Index(['category'])
export class HolonetPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  authorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', default: PostCategory.NEWS })
  category: PostCategory;

  @CreateDateColumn()
  createdAt: Date;
}
