import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { Alliance } from './alliance.entity';

@Entity('alliance_memberships')
@Index('IDX_alliance_memberships_alliance', ['allianceId'])
export class AllianceMembership {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  allianceId: number;

  @ManyToOne(() => Alliance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'allianceId' })
  alliance: Alliance;

  @Index('UQ_alliance_memberships_user', { unique: true })
  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  joinedAt: Date;
}
