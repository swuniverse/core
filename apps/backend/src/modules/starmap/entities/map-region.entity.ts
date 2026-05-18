import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Layer } from './layer.entity';

@Entity('map_regions')
@Index(['layerId', 'name'], { unique: true })
export class MapRegion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  layerId: number;

  @ManyToOne(() => Layer)
  @JoinColumn({ name: 'layerId' })
  layer: Layer;

  @Column({ length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 32, default: 'neutral' })
  colorKey: string;
}
