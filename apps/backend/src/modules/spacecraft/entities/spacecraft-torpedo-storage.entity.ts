import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Spacecraft } from './spacecraft.entity';

@Entity('spacecraft_torpedo_storage')
@Index(['spacecraftId', 'torpedoTypeId'], { unique: true })
export class SpacecraftTorpedoStorage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  spacecraftId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column()
  torpedoTypeId: number;

  @Column()
  commodityId: number;

  @Column({ default: 0 })
  amount: number;

  @Column({ default: false })
  isActive: boolean;
}
