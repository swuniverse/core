import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../auth/user.entity';

@Entity('ignore_list')
@Unique('UQ_ignore_list_owner_ignored', ['ownerId', 'ignoredUserId'])
export class IgnoreList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ignoredUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ignoredUserId' })
  ignoredUser: User;

  @CreateDateColumn()
  createdAt: Date;
}
