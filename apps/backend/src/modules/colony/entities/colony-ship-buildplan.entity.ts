import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { ShipModuleSelection } from '@swuniverse/shared';
import { Colony } from './colony.entity';

export type { ShipModuleSelection };

@Entity('colony_ship_buildplans')
@Index(['colonyId', 'name'], { unique: true })
@Index(['colonyId', 'signature'])
@Index(['userId', 'shipClassId'])
export class ColonyShipBuildplan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  colonyId!: number;

  @ManyToOne(() => Colony, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colonyId' })
  colony!: Colony;

  @Column()
  shipClassId!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 128 })
  signature!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  moduleSelections!: ShipModuleSelection[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  moduleTypes!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  moduleCommodityIds!: number[];

  @CreateDateColumn()
  createdAt!: Date;
}
