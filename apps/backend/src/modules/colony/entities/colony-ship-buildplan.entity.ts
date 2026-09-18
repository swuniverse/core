import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { ShipModuleSelection } from '@swuniverse/shared';

export type { ShipModuleSelection };

@Entity('colony_ship_buildplans')
@Index(['userId', 'name'], { unique: true })
@Index(['userId', 'signature'], { unique: true })
@Index(['userId', 'shipClassId'])
export class ColonyShipBuildplan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

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
