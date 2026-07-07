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

export enum ResearchStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  QUEUED = 'QUEUED',
  COMPLETED = 'COMPLETED',
}

@Entity('research')
@Index(['userId', 'techId'], { unique: true })
export class Research {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  techId: number;

  @Column({ type: 'varchar', default: ResearchStatus.LOCKED })
  status: ResearchStatus;

  @Column({ default: 0 })
  progress: number;

  @Column({ type: 'int', nullable: true })
  remainingPoints: number | null;

  @Column({ default: 0 })
  spentPoints: number;

  @Column({ type: 'int', nullable: true })
  sourceCommodityId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  blockedReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastAdvancedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  finishesAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
