import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { User } from '../../auth/user.entity';

@Entity('notes')
@Check('CHK_notes_title_length', 'char_length("title") BETWEEN 1 AND 100')
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_notes_userId')
  @Column({ type: 'int' })
  userId: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text', default: '' })
  text: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
