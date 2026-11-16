import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/user.entity';
@Entity('user_message_folders')
@Index(['userId', 'sortOrder'])
export class UserMessageFolder {
  @PrimaryGeneratedColumn() id: number;
  @Column() userId: number;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
  @Column({ length: 40 }) name: string;
  @Column({ default: 0 }) sortOrder: number;
}
