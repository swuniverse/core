import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Colony } from './colony.entity';

export enum ColonyEventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum ColonyEventType {
  BUILDING_DEACTIVATED = 'BUILDING_DEACTIVATED',
  STORAGE_FULL = 'STORAGE_FULL',
  BUILDING_FINISHED = 'BUILDING_FINISHED',
  TERRAFORMING_FINISHED = 'TERRAFORMING_FINISHED',
  CREW_LIMIT_EXCEEDED = 'CREW_LIMIT_EXCEEDED',
  FABRICATION_COMPLETED = 'FABRICATION_COMPLETED',
  CREW_TRAINING_COMPLETED = 'CREW_TRAINING_COMPLETED',
  SHIP_BUILD_COMPLETED = 'SHIP_BUILD_COMPLETED',
  SHIP_REPAIR_COMPLETED = 'SHIP_REPAIR_COMPLETED',
  SHIP_RETROFIT_COMPLETED = 'SHIP_RETROFIT_COMPLETED',
  HANGAR_RUMP_BUILT = 'HANGAR_RUMP_BUILT',
  HANGAR_SHIP_STARTED = 'HANGAR_SHIP_STARTED',
  SHIP_LANDED = 'SHIP_LANDED',
  SHIP_DISASSEMBLED = 'SHIP_DISASSEMBLED',
  COLONY_FOUNDED = 'COLONY_FOUNDED',
  COLONY_ATTACKED = 'COLONY_ATTACKED',
  BUILDING_DAMAGED = 'BUILDING_DAMAGED',
  BUILDING_DESTROYED = 'BUILDING_DESTROYED',
  BUILDING_DISABLED_BY_DAMAGE = 'BUILDING_DISABLED_BY_DAMAGE',
  BUILDING_REPAIRED = 'BUILDING_REPAIRED',
  BUILDINGS_REPAIRED = 'BUILDINGS_REPAIRED',
  SHIELDS_LOADED = 'SHIELDS_LOADED',
  SHIELDS_DEPLETED = 'SHIELDS_DEPLETED',
  PHALANX_FIRED = 'PHALANX_FIRED',
  WASTE_DISCARDED = 'WASTE_DISCARDED',
  SHIP_REPAIR_REACTIVATED = 'SHIP_REPAIR_REACTIVATED',
  ORBIT_DEFENSE_STARTED = 'ORBIT_DEFENSE_STARTED',
  ORBIT_DEFENSE_STOPPED = 'ORBIT_DEFENSE_STOPPED',
  ORBIT_BLOCKADE_STARTED = 'ORBIT_BLOCKADE_STARTED',
  ORBIT_BLOCKADE_STOPPED = 'ORBIT_BLOCKADE_STOPPED',
  SHUTTLES_TRANSFERRED = 'SHUTTLES_TRANSFERRED',
}

@Entity('colony_events')
@Index(['colonyId', 'createdAt'])
@Index(['userId', 'readAt'])
@Index(['colonyId', 'readAt'])
@Index(['type'])
export class ColonyEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  colonyId: number;

  @ManyToOne(() => Colony, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colonyId' })
  colony: Colony;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 64 })
  type: ColonyEventType;

  @Column({ type: 'varchar', length: 16, default: ColonyEventSeverity.INFO })
  severity: ColonyEventSeverity;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, unknown>;

  @Column({ type: 'bigint', nullable: true })
  tickId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
