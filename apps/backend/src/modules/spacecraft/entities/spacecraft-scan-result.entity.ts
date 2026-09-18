import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { Spacecraft } from './spacecraft.entity';

export enum SpacecraftScanType {
  SECTOR = 'SECTOR',
  SYSTEM_FIELD = 'SYSTEM_FIELD',
}

@Entity('spacecraft_scan_results')
@Index(['userId', 'createdAt'])
export class SpacecraftScanResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  spacecraftId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column({ type: 'varchar', length: 32 })
  type: SpacecraftScanType;

  @Column({ type: 'int', nullable: true })
  layerId: number | null;

  @Column({ type: 'int', nullable: true })
  starSystemId: number | null;

  @Column()
  x: number;

  @Column()
  y: number;

  @Column()
  energyCost: number;

  @Column()
  cooldown: number;

  @Column({ type: 'jsonb' })
  result: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
