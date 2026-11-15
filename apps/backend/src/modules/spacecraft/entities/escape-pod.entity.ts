import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SpaceLocation } from '../../starmap/entities/space-location.entity';

export enum EscapePodLaunchReason {
  COMBAT_DESTRUCTION = 'COMBAT_DESTRUCTION',
  SELF_DESTRUCTION = 'SELF_DESTRUCTION',
  ANOMALY_DESTRUCTION = 'ANOMALY_DESTRUCTION',
  FIELD_DAMAGE_DESTRUCTION = 'FIELD_DAMAGE_DESTRUCTION',
  LIFE_SUPPORT_FAILURE = 'LIFE_SUPPORT_FAILURE',
}

/**
 * Neutral passive object holding the individual crew of a lost ship. Not a
 * Spacecraft: it has no owner, class or controls. Crew members live in
 * `crew_assignments.escapePodId`.
 */
@Entity('escape_pods')
@Index(['locationId'])
export class EscapePod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  locationId!: number;

  @ManyToOne(() => SpaceLocation, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'locationId' })
  location!: SpaceLocation;

  /** Immutable origin metadata; the ship itself no longer exists. */
  @Column({ type: 'int' })
  originSpacecraftId!: number;

  @Column({ type: 'varchar', length: 255 })
  originShipName!: string;

  @Column({ type: 'int' })
  originShipClassId!: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  originFaction!: string | null;

  @Column({ type: 'varchar', length: 64 })
  presentationKey!: string;

  @Column({ type: 'varchar', length: 32 })
  launchReason!: EscapePodLaunchReason;

  @CreateDateColumn()
  createdAt!: Date;
}
