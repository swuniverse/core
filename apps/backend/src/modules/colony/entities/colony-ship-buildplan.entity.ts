import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Colony } from './colony.entity';

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
  moduleCommodityIds!: number[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  moduleTypes!: string[];

  @CreateDateColumn()
  createdAt!: Date;
}
