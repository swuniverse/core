import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/user.entity';

@Entity('news')
export class News {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  links: string[];

  @Column({ default: false })
  isChangelog: boolean;

  /** `null` once the author's account was deleted (sh-AP-05b). */
  @Column({ type: 'int', nullable: true })
  authorId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
