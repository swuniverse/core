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
import type { CelestialObject } from './celestial-object.entity';

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

  @Column({ default: 22 })
  maxX: number;

  @Column({ default: 22 })
  maxY: number;

  @Column({ default: false })
  isLandmark: boolean;

  /**
   * Counts towards the database star system catalog per layer (tmw-D5c).
   * Test and admin experiment systems are excluded explicitly.
   */
  @Column({ default: true })
  inDatabaseCatalog: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  landmarkKey: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  landmarkCategory: string | null;

  @Column({ type: 'smallint', default: 2 })
  bonusFields: number;

  @OneToMany(
    () => require('./celestial-object.entity').CelestialObject,
    (object: CelestialObject) => object.starSystem,
  )
  celestialObjects: CelestialObject[];
}
