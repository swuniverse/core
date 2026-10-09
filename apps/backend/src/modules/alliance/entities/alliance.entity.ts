import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FactionEntity } from '../../faction/entities/faction.entity';
import { DEFAULT_ALLIANCE_TITLES } from '../alliance.constants';

// The unique lower(name) index UQ_alliances_name_lower lives in the migration;
// TypeORM cannot express expression indexes.
@Entity('alliances')
export class Alliance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  homepage: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ type: 'int' })
  factionId: number;

  @ManyToOne(() => FactionEntity)
  @JoinColumn({ name: 'factionId' })
  faction: FactionEntity;

  @Column({ type: 'boolean', default: false })
  acceptsApplications: boolean;

  @Column({
    type: 'varchar',
    length: 30,
    default: DEFAULT_ALLIANCE_TITLES.president,
  })
  presidentTitle: string;

  @Column({ type: 'varchar', length: 30, default: DEFAULT_ALLIANCE_TITLES.vice })
  viceTitle: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: DEFAULT_ALLIANCE_TITLES.diplomat,
  })
  diplomatTitle: string;

  /** Opaque key of the banner asset; the image itself is never stored here. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  bannerKey: string | null;

  @Column({ type: 'timestamp', nullable: true })
  bannerUpdatedAt: Date | null;

  @CreateDateColumn()
  foundedAt: Date;
}
