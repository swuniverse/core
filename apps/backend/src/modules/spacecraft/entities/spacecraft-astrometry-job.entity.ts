import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SpacecraftAstrometryJobStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
}

@Entity('spacecraft_astrometry_jobs')
@Index(['spacecraftId', 'status'])
@Index(['userId'])
export class SpacecraftAstrometryJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  spacecraftId: number;

  @Column()
  starSystemId: number;

  @Column({
    type: 'varchar',
    length: 16,
    default: SpacecraftAstrometryJobStatus.ACTIVE,
  })
  status: SpacecraftAstrometryJobStatus;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp' })
  completesAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  abortReason: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
