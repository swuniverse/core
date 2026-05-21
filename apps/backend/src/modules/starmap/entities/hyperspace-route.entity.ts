import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Layer } from './layer.entity';

@Entity('hyperspace_routes')
@Index(['layerId'])
@Unique(['layerId', 'key'])
export class HyperspaceRoute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  layerId: number;

  @ManyToOne(() => Layer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'layerId' })
  layer: Layer;

  @Column({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 32, default: '#facc15' })
  color: string;

  @Column({ default: 0 })
  sortOrder: number;
}
