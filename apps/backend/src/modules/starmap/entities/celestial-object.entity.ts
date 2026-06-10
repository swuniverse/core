import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StarSystem } from './star-system.entity';

export enum CelestialObjectType {
  PLANET = 1,
  MOON = 2,
  ASTEROID = 3,
}

@Entity('celestial_objects')
@Index(['systemId'])
export class CelestialObject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  systemId: number;

  @ManyToOne(() => StarSystem, (sys) => sys.celestialObjects)
  @JoinColumn({ name: 'systemId' })
  starSystem: StarSystem;

  @Column({ type: 'int' })
  objectType: CelestialObjectType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column()
  posX: number;

  @Column()
  posY: number;

  @Column({ type: 'int', nullable: true })
  classId: number | null;

  @Column({ default: false })
  isColonizable: boolean;

  @Column({ type: 'int', nullable: true })
  surfaceWidth: number | null;

  @Column({ type: 'int', nullable: true })
  surfaceHeight: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  terrainSeed: string | null;
}
