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
import { FactionEntity } from '../../faction/entities/faction.entity';
import { Layer } from '../../starmap/entities/layer.entity';
import { StarSystem } from '../../starmap/entities/star-system.entity';
import { CelestialObject } from '../../starmap/entities/celestial-object.entity';

export enum OnboardingSelectionStatus {
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
}

@Entity('onboarding_selections')
@Index(['userId'], { unique: true })
export class OnboardingSelection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', nullable: true })
  factionId: number | null;

  @ManyToOne(() => FactionEntity, { nullable: true })
  @JoinColumn({ name: 'factionId' })
  faction: FactionEntity | null;

  @Column({ type: 'int', nullable: true })
  selectedLayerId: number | null;

  @ManyToOne(() => Layer, { nullable: true })
  @JoinColumn({ name: 'selectedLayerId' })
  selectedLayer: Layer | null;

  @Column({ type: 'int', nullable: true })
  selectedSectorX: number | null;

  @Column({ type: 'int', nullable: true })
  selectedSectorY: number | null;

  @Column({ type: 'int', nullable: true })
  selectedSystemId: number | null;

  @ManyToOne(() => StarSystem, { nullable: true })
  @JoinColumn({ name: 'selectedSystemId' })
  selectedSystem: StarSystem | null;

  @Column({ type: 'int', nullable: true })
  selectedCelestialObjectId: number | null;

  @ManyToOne(() => CelestialObject, { nullable: true })
  @JoinColumn({ name: 'selectedCelestialObjectId' })
  selectedCelestialObject: CelestialObject | null;

  @Column({ type: 'varchar', default: OnboardingSelectionStatus.STARTED })
  status: OnboardingSelectionStatus;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
