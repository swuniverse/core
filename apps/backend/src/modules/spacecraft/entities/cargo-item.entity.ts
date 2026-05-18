import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Spacecraft } from './spacecraft.entity';

@Entity('cargo_items')
@Unique(['spacecraftId', 'commodityId'])
export class CargoItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  spacecraftId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column()
  commodityId: number;

  @Column({ default: 0 })
  amount: number;
}
