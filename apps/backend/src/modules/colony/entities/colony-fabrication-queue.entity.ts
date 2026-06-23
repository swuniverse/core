import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

export enum ColonyFabricationQueueType {
  MODULE = 'MODULE',
  TORPEDO = 'TORPEDO',
}

export enum ColonyFabricationQueueStatus {
  QUEUED = 'QUEUED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('colony_fabrication_queue')
@Index(['colonyId', 'status'])
@Index(['userId', 'status'])
export class ColonyFabricationQueue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  colonyId: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar' })
  queueType: ColonyFabricationQueueType;

  @Column({ length: 255 })
  itemKey: string;

  @Column({ default: 1 })
  amount: number;

  @Column()
  buildingFunctionId: number;

  @Column({ type: 'timestamp' })
  finishesAt: Date;

  @Column({ type: 'varchar', default: ColonyFabricationQueueStatus.QUEUED })
  status: ColonyFabricationQueueStatus;
}
