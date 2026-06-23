import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

export enum ColonyCrewTrainingQueueStatus {
  QUEUED = 'QUEUED',
  COMPLETED = 'COMPLETED',
}

@Entity('colony_crew_training_queue')
@Index(['colonyId', 'status'])
@Index(['userId', 'status'])
export class ColonyCrewTrainingQueue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  colonyId: number;

  @Column()
  userId: number;

  @Column({ default: 1 })
  amount: number;

  @Column({ type: 'timestamp' })
  finishesAt: Date;

  @Column({ type: 'varchar', default: ColonyCrewTrainingQueueStatus.QUEUED })
  status: ColonyCrewTrainingQueueStatus;
}
