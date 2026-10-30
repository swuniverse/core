import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ResearchRewardGrantStatus {
  RESERVED = 'RESERVED',
  COMPLETED = 'COMPLETED',
}

/** Durable idempotency record: one ship reward per player and research. */
@Entity('research_reward_grant')
@Index(['userId', 'techId'], { unique: true })
export class ResearchRewardGrant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  techId: number;

  @Column({ type: 'varchar', default: ResearchRewardGrantStatus.RESERVED })
  status: ResearchRewardGrantStatus;

  @Column({ type: 'timestamp', nullable: true })
  grantedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
