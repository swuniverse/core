import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StarSystem } from './star-system.entity';
import { HyperspaceRoute } from './hyperspace-route.entity';

@Entity('hyperspace_route_segments')
@Index(['routeId', 'sortOrder'])
export class HyperspaceRouteSegment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  routeId: number;

  @ManyToOne(() => HyperspaceRoute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: HyperspaceRoute;

  @Column()
  fromSystemId: number;

  @ManyToOne(() => StarSystem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromSystemId' })
  fromSystem: StarSystem;

  @Column()
  toSystemId: number;

  @ManyToOne(() => StarSystem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toSystemId' })
  toSystem: StarSystem;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  controlPointJson: Array<{ x: number; y: number }> | null;
}
