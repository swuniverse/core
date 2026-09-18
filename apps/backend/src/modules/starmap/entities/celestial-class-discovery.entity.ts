import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('celestial_class_discoveries')
@Index(['userId', 'classId'], { unique: true })
export class CelestialClassDiscovery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  classId: number;

  @Column()
  celestialObjectId: number;

  @Column()
  spacecraftId: number;

  @Column({ type: 'varchar', length: 32 })
  source: 'SECTOR_SCAN';

  @CreateDateColumn()
  discoveredAt: Date;
}
