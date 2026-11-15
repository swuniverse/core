import {
  Check,
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

/** STU `AstronomicalEntry`: a plan charts a star system or a map region. */
export enum CartographyTargetType {
  SYSTEM = 'SYSTEM',
  REGION = 'REGION',
}

export enum CartographyCompletionOutcome {
  SUCCESS = 'SUCCESS',
  INVALIDATED = 'INVALIDATED',
}

@Entity('cartography_plans')
@Check(
  'CHK_cartography_plans_target',
  `("targetType" = 'SYSTEM' AND "starSystemId" IS NOT NULL AND "mapRegionId" IS NULL) OR ("targetType" = 'REGION' AND "mapRegionId" IS NOT NULL AND "starSystemId" IS NULL)`,
)
@Index(['userId', 'starSystemId'], { unique: true, where: '"starSystemId" IS NOT NULL' })
@Index(['userId', 'mapRegionId'], { unique: true, where: '"mapRegionId" IS NOT NULL' })
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

  @Column({ type: 'varchar', length: 16, default: CartographyTargetType.SYSTEM })
  targetType: CartographyTargetType;

  /** Set exactly for `SYSTEM` plans. */
  @Column({ type: 'int', nullable: true })
  starSystemId: number | null;

  /** Set exactly for `REGION` plans. */
  @Column({ type: 'int', nullable: true })
  mapRegionId: number | null;

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
