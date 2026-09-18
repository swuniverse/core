import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Spacecraft } from './spacecraft.entity';

@Entity('ship_log_entries')
@Index(['spacecraftId', 'createdAt'])
export class ShipLogEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  spacecraftId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column()
  authorId: number;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
