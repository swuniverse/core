import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CartographyPlanStatus {
  PLANNED = 'PLANNED',
  MEASURED = 'MEASURED',
  FINISHING = 'FINISHING',
  DONE = 'DONE',
}

export enum CartographyCompletionOutcome {
  SUCCESS = 'SUCCESS',
  INVALIDATED = 'INVALIDATED',
}

@Entity('cartography_plans')
@Index(['userId', 'starSystemId'], { unique: true })
@Index(['userId'])
@Index(['starSystemId', 'status'])
@Index(['finalizingSpacecraftId'], {
  unique: true,
  where: '"status" = \'FINISHING\'',
})
export class CartographyPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  starSystemId: number;

  @Column({
    type: 'varchar',
    length: 16,
    default: CartographyPlanStatus.PLANNED,
  })
  status: CartographyPlanStatus;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  remainingFieldIds: number[];

  @Column({ type: 'timestamp', nullable: true })
  finalizationStartedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  finalizationTick: number | null;

  @Column({ type: 'int', nullable: true })
  finalizingSpacecraftId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  completionOutcome: CartographyCompletionOutcome | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
