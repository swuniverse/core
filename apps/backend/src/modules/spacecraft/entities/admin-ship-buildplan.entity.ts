import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ShipModuleSelection } from '@swuniverse/shared';

@Entity('admin_ship_buildplans')
@Index(['name'], { unique: true })
export class AdminShipBuildplan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column()
  shipClassId: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  moduleSelections: ShipModuleSelection[];

  @CreateDateColumn()
  createdAt: Date;
}
