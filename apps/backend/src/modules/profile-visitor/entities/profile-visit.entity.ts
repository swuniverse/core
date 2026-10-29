import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../auth/user.entity';

@Entity('profile_visits')
@Unique('UQ_profile_visits_visitor_profile', ['visitorId', 'profileUserId'])
@Index(['profileUserId', 'visitedAt'])
export class ProfileVisit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  visitorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visitorId' })
  visitor: User;

  @Column()
  profileUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileUserId' })
  profileUser: User;

  @Column({ type: 'timestamp' })
  visitedAt: Date;
}
