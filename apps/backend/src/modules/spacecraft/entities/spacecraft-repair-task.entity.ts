import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Spacecraft } from './spacecraft.entity';

export enum RepairTargetType {
  HULL = 'HULL',
  MODULE = 'MODULE',
}

export enum RepairPartsType {
  SPARE_PARTS = 'SPARE_PARTS',
  SYSTEM_COMPONENTS = 'SYSTEM_COMPONENTS',
  BOTH = 'BOTH',
}

@Entity('spacecraft_repair_tasks')
export class SpacecraftRepairTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  spacecraftId: number;

  @OneToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column({ type: 'varchar' })
  targetType: RepairTargetType;

  @Column({ type: 'int', nullable: true })
  moduleId: number | null;

  @Column({ type: 'varchar' })
  partsType: RepairPartsType;

  @Column({ type: 'int' })
  targetIntegrity: number;

  @Column({ type: 'int', default: 0 })
  spareParts: number;

  @Column({ type: 'int', default: 0 })
  systemComponents: number;

  @Column({ type: 'timestamp' })
  completesAt: Date;
}
