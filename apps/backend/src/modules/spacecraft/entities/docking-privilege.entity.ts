import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  DockingPrivilegeMode,
  DockingPrivilegeType,
} from '../docking-privilege.types';
import { Spacecraft } from './spacecraft.entity';

export { DockingPrivilegeMode, DockingPrivilegeType };

/** One access rule of a station owner; a matching deny beats every allow. */
@Entity('docking_privileges')
@Index('UQ_docking_privileges_target', ['stationId', 'targetType', 'targetId'], {
  unique: true,
})
@Index('IDX_docking_privileges_target_lookup', ['targetType', 'targetId'])
export class DockingPrivilege {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  stationId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stationId' })
  station: Spacecraft;

  @Column({ type: 'varchar', length: 16 })
  targetType: DockingPrivilegeType;

  @Column({ type: 'int' })
  targetId: number;

  @Column({ type: 'varchar', length: 8 })
  mode: DockingPrivilegeMode;
}
