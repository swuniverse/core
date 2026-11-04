import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Colony } from './colony.entity';
import { ShipClassDef } from '../../spacecraft/entities/ship-class-def.entity';

export enum ShipBuildSource {
  COLONY = 'COLONY',
  STATION = 'STATION',
}
import { Spacecraft } from '../../spacecraft/entities/spacecraft.entity';
import type { ShipModuleSelection } from '@swuniverse/shared';

export enum ColonyShipBuildQueueStatus {
  QUEUED = 'QUEUED',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ColonyShipBuildQueueMode {
  BUILD = 'BUILD',
  REPAIR = 'REPAIR',
  RETROFIT = 'RETROFIT',
}

export interface ColonyShipRepairSnapshot {
  hullBefore: number;
  hullAfter: number;
  moduleIntegrityBefore: Array<{ moduleId: number; integrity: number }>;
  costs: Array<{ commodityId: number; amount: number }>;
}

export interface ColonyShipRetrofitSnapshot {
  oldModuleSelections: ShipModuleSelection[];
  newModuleSelections: ShipModuleSelection[];
  newModuleTypes: string[];
  returnedModuleCommodityIds: number[];
  consumedModuleCommodityIds: number[];
}

@Entity('colony_ship_build_queue')
@Index(['colonyId', 'status'])
@Index(['userId', 'status'])
@Index('IDX_ship_build_queue_station_status', ['stationId', 'status'])
@Check(
  'CHK_ship_build_queue_one_source',
  `("source" = 'COLONY' AND "colonyId" IS NOT NULL AND "stationId" IS NULL) OR ("source" = 'STATION' AND "stationId" IS NOT NULL AND "colonyId" IS NULL)`,
)
export class ColonyShipBuildQueue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: ShipBuildSource.COLONY })
  source: ShipBuildSource;

  @Column({ type: 'int', nullable: true })
  colonyId: number | null;

  @ManyToOne(() => Colony, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colonyId' })
  colony: Colony | null;

  @Column({ type: 'int', nullable: true })
  stationId: number | null;

  @ManyToOne(() => Spacecraft, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stationId' })
  station: Spacecraft | null;

  @Column()
  userId: number;

  @Column()
  shipClassId: number;

  @Column({ type: 'varchar', default: ColonyShipBuildQueueMode.BUILD })
  mode: ColonyShipBuildQueueMode;

  /**
   * Shipyard building function the BUILD/RETROFIT job occupies (STU: one job
   * per function). Null for REPAIR jobs and for jobs queued before binding.
   */
  @Column({ type: 'int', nullable: true })
  buildingFunctionId: number | null;

  @Column({ type: 'int', nullable: true })
  spacecraftId: number | null;

  @ManyToOne(() => Spacecraft, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft | null;

  @ManyToOne(() => ShipClassDef)
  @JoinColumn({ name: 'shipClassId' })
  shipClass: ShipClassDef;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  buildPlanName: string | null;

  @Column({ type: 'int', nullable: true })
  buildPlanId: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  buildPlanSignature: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  moduleSelections: ShipModuleSelection[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  moduleTypes: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  moduleCommodityIds: number[];

  @Column({ type: 'int', nullable: true })
  crewRequired: number | null;

  @Column({ type: 'jsonb', nullable: true })
  buildSnapshot: {
    version: 1;
    modules: Array<{
      slotId: string;
      commodityId: number;
      moduleType: string;
      category: string;
      level: number;
    }>;
    crewRequired: number;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  repairSnapshot: ColonyShipRepairSnapshot | null;

  @Column({ type: 'jsonb', nullable: true })
  retrofitSnapshot: ColonyShipRetrofitSnapshot | null;

  @Column({ type: 'timestamp' })
  finishesAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  stoppedAt: Date | null;

  @Column({ type: 'varchar', default: ColonyShipBuildQueueStatus.QUEUED })
  status: ColonyShipBuildQueueStatus;
}
