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

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  posX: number;

  @Column()
  posY: number;

  @Column({ type: 'int', nullable: true })
  classId: number | null;

  /**
   * Urspruengliche STU-classId, gesichert beim SWU-Umschalten ("SET EMPTY TO
   * SWU"), damit "SET EMPTY TO STU" exakt zurueckstellen kann. Nur waehrend
   * classId eine synthetische SWU-Archetyp-Id (90000er-Bereich) ist gesetzt.
   */
  @Column({ type: 'int', nullable: true })
  originalClassId: number | null;

  /** SWU-Rotation ('rotating' | 'tidal-locked'); null = noch STU/unbekannt (Fallback: Namens-Suffix). */
  @Column({ type: 'varchar', length: 16, nullable: true })
  swuRotation: 'rotating' | 'tidal-locked' | null;

  /** SWU-Planet mit Ring (Monde/Asteroiden nie). */
  @Column({ default: false })
  swuRing: boolean;

  @Column({ default: false })
  isColonizable: boolean;

  @Column({ type: 'int', nullable: true })
  surfaceWidth: number | null;

  @Column({ type: 'int', nullable: true })
  surfaceHeight: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  terrainSeed: string | null;
}
