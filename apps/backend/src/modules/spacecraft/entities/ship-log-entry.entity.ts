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

  /** STU `is_private`: hidden from scans and foreign profiles. */
  @Column({ default: false })
  isPrivate: boolean;

  /** STU `edited`: text edits only; entries edited after a scan stay hidden. */
  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
