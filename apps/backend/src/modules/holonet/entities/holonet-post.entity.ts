import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import type { RpgPlot } from '../../rpg/rpg-plot.entity';
import type { UserCharacter } from '../../rpg/user-character.entity';

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

  /** `null` once the author's account was deleted (sh-AP-05b). */
  @Column({ type: 'int', nullable: true })
  authorId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author: User | null;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', default: PostCategory.NEWS })
  category: PostCategory;

  @Column({ type: 'int', nullable: true })
  plotId: number | null;

  @ManyToOne('RpgPlot', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plotId' })
  plot: RpgPlot | null;

  @ManyToMany('UserCharacter')
  @JoinTable({
    name: 'holonet_post_characters',
    joinColumn: { name: 'postId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'characterId', referencedColumnName: 'id' },
  })
  characters: UserCharacter[];

  @Column({ default: false })
  isPinned: boolean;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int', default: 0 })
  rating: number;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
