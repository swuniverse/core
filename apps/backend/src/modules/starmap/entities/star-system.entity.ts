import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Layer } from './layer.entity';
import { CelestialObject } from './celestial-object.entity';

@Entity('star_systems')
@Index(['cx', 'cy', 'layerId'], { unique: true })
export class StarSystem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column()
  cx: number;

  @Column()
  cy: number;

  @Column()
  layerId: number;

  @ManyToOne(() => Layer)
  @JoinColumn({ name: 'layerId' })
  layer: Layer;

  @Column()
  systemTypeId: number;

  @Column({ default: 20 })
  maxX: number;

  @Column({ default: 20 })
  maxY: number;

  @OneToMany(() => CelestialObject, (obj) => obj.starSystem)
  celestialObjects: CelestialObject[];
}
