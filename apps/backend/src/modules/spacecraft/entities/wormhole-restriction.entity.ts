import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  WormholeRestrictionMode,
  WormholeRestrictionTargetType,
} from '@swuniverse/shared';
import { Wormhole } from '../../starmap/entities/wormhole.entity';

@Entity('wormhole_restrictions')
@Index(
  'UQ_wormhole_restrictions_target',
  ['wormholeId', 'targetType', 'targetId'],
  { unique: true },
)
export class WormholeRestriction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  wormholeId: number;

  @ManyToOne(() => Wormhole, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wormholeId' })
  wormhole: Wormhole;

  @Column({ type: 'varchar', length: 16 })
  targetType: WormholeRestrictionTargetType;

  @Column({ type: 'int' })
  targetId: number;

  @Column({ type: 'varchar', length: 8 })
  mode: WormholeRestrictionMode;
}
