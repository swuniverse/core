import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('celestial_class_discoveries')
@Index(['userId', 'swuTypeKey'], { unique: true })
export class CelestialClassDiscovery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  /** Synthetische SWU-classId (Grafik); nicht eindeutig, da Rotation/Ring/Mond eigene Typen sind. */
  @Column()
  classId: number;

  /** SWU-Planetentyp-Schluessel, siehe resolveSwuPlanetType(). */
  @Column({ type: 'varchar', length: 32 })
  swuTypeKey: string;

  @Column()
  celestialObjectId: number;

  @Column({ type: 'int', nullable: true })
  spacecraftId: number | null;

  @Column({ type: 'varchar', length: 32 })
  source: 'SECTOR_SCAN' | 'COLONIZATION' | 'FIRST_COLONY';

  @CreateDateColumn()
  discoveredAt: Date;
}
