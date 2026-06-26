import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Spacecraft } from './spacecraft.entity';

@Entity('spacecraft_torpedo_storage')
@Index(['spacecraftId'], { unique: true })
export class SpacecraftTorpedoStorage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  spacecraftId: number;

  @OneToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column()
  torpedoTypeId: number;

  @Column()
  commodityId: number;

  @Column({ default: 0 })
  amount: number;
}
