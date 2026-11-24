import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { AlliancePermission } from '@swuniverse/shared';
import { Alliance } from './alliance.entity';

/** STU `AllianceJob`: a freely configured role with its rights. */
@Entity('alliance_roles')
@Index('IDX_alliance_roles_alliance', ['allianceId'])
@Index('UQ_alliance_roles_founder', ['allianceId'], {
  unique: true,
  where: '"founder"',
})
export class AllianceRoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  allianceId: number;

  @ManyToOne(() => Alliance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'allianceId' })
  alliance: Alliance;

  @Column({ type: 'varchar', length: 30 })
  title: string;

  @Column({ type: 'int' })
  sort: number;

  @Column({ type: 'varchar', length: 32, array: true, default: '{}' })
  permissions: AlliancePermission[];

  /** Mirrors `'FOUNDER' = ANY(permissions)` (CHECK) for the one-holder index. */
  @Column({ type: 'boolean', default: false })
  founder: boolean;
}
