import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CelestialObject } from './celestial-object.entity';

export enum PlanetFieldLayer {
  ORBIT = 'ORBIT',
  SURFACE = 'SURFACE',
  UNDERGROUND = 'UNDERGROUND',
}

@Entity('planet_fields')
@Index(['celestialObjectId', 'fieldLayer', 'px', 'py'], { unique: true })
@Index(['celestialObjectId', 'fieldLayer'])
export class PlanetField {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  celestialObjectId: number;

  @ManyToOne(() => CelestialObject)
  @JoinColumn({ name: 'celestialObjectId' })
  celestialObject: CelestialObject;

  @Column({ type: 'varchar', length: 16 })
  fieldLayer: PlanetFieldLayer;

  @Column()
  px: number;

  @Column()
  py: number;

  @Column({ type: 'varchar', length: 64 })
  terrainType: string;

  @Column({ type: 'int', nullable: true })
  buildingId: number | null;

  @Column({ default: true })
  isBuildable: boolean;

  @Column({ default: 0 })
  resourceModifier: number;
}
