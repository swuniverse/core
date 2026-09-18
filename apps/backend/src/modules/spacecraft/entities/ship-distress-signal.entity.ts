import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Spacecraft } from './spacecraft.entity';

@Entity('ship_distress_signals')
@Index(['spacecraftId', 'active'])
@Index(['active', 'startedAt'])
export class ShipDistressSignal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  spacecraftId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column()
  ownerId: number;

  @Column({ type: 'varchar', length: 250 })
  message: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  stoppedAt: Date | null;
}
