import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Colony } from './colony.entity';
import { ShipClassDef } from '../../spacecraft/entities/ship-class-def.entity';
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
export class ColonyShipBuildQueue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  colonyId: number;

  @ManyToOne(() => Colony, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colonyId' })
  colony: Colony;

  @Column()
  userId: number;

  @Column()
  shipClassId: number;

  @Column({ type: 'varchar', default: ColonyShipBuildQueueMode.BUILD })
  mode: ColonyShipBuildQueueMode;

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

  @Column({ default: 0 })
  crewAssigned: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  crewIds: number[];

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
