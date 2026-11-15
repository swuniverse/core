import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MapRegion } from './map-region.entity';

export enum RegionDiscoverySource {
  CARTOGRAPHY = 'CARTOGRAPHY',
}

/** Personal region discovery (STU `AstronomicalEntry` with `region_id`). */
@Entity('region_discoveries')
@Index(['userId', 'mapRegionId'], { unique: true })
@Index(['mapRegionId'])
export class RegionDiscovery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  mapRegionId: number;

  @ManyToOne(() => MapRegion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mapRegionId' })
  mapRegion?: MapRegion;

  @Column({ type: 'varchar', length: 32 })
  source: RegionDiscoverySource;

  @CreateDateColumn()
  discoveredAt: Date;
}
