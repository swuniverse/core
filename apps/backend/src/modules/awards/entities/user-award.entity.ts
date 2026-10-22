import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { Award } from './award.entity';

@Entity('user_awards')
@Unique('UQ_user_awards_user_award', ['userId', 'awardKey'])
@Check('CHK_user_awards_count_positive', '"count" >= 1')
export class UserAward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 64 })
  awardKey: string;

  @ManyToOne(() => Award, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'awardKey' })
  award: Award;

  @Column({ default: 1 })
  count: number;

  @CreateDateColumn()
  firstGrantedAt: Date;
}
