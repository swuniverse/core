import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Colony } from './colony.entity';

@Entity('colony_storage')
@Index(['colonyId', 'commodityId'], { unique: true })
export class ColonyStorage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  colonyId: number;

  @ManyToOne(() => Colony, (colony) => colony.storage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colonyId' })
  colony: Colony;

  @Column()
  commodityId: number;

  @Column({ default: 0 })
  amount: number;
}
