import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { StarSystem } from '../../starmap/entities/star-system.entity';
import { CelestialObject } from '../../starmap/entities/celestial-object.entity';
import { ColonyField } from './colony-field.entity';
import { ColonyStorage } from './colony-storage.entity';
import { ColonyStats } from './colony-stats.entity';
import { ColonyChangeable } from './colony-changeable.entity';

@Entity('colonies')
@Index(['userId'])
@Index(['starSystemId'])
export class Colony {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'int', nullable: true })
  starSystemId: number | null;

  @ManyToOne(() => StarSystem, { nullable: true })
  @JoinColumn({ name: 'starSystemId' })
  starSystem: StarSystem;

  @Column({ type: 'int', nullable: true })
  celestialObjectId: number | null;

  @ManyToOne(() => CelestialObject, { nullable: true })
  @JoinColumn({ name: 'celestialObjectId' })
  celestialObject: CelestialObject | null;

  @Column({ default: 0 })
  posX: number;

  @Column({ default: 0 })
  posY: number;

  @Column()
  colonyClassId: number;

  @Column({ type: 'text', nullable: true })
  surfaceMask: string | null;

  @Column({ type: 'int', nullable: true })
  surfaceWidth: number | null;

  @Column({ type: 'float', nullable: true })
  rotationFactor: number | null;

  @Column({ default: false })
  isAbandoned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  abandonedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  previousUserId: number | null;

  @Column({ default: 0 })
  energy: number;

  @Column({ default: 100 })
  energyMax: number;

  @Column({ default: 10 })
  population: number;

  @Column({ default: 100 })
  populationMax: number;

  @Column({ default: 0 })
  storageUsed: number;

  @Column({ default: 3000 })
  storageMax: number;

  @OneToMany(() => ColonyField, (field) => field.colony, { cascade: true })
  fields: ColonyField[];

  @OneToMany(() => ColonyStorage, (storage) => storage.colony, {
    cascade: true,
  })
  storage: ColonyStorage[];

  @OneToOne(() => ColonyStats, (stats) => stats.colony, { cascade: true })
  stats: ColonyStats;

  @OneToOne(() => ColonyChangeable, (changeable) => changeable.colony, {
    cascade: true,
  })
  changeable: ColonyChangeable;

  @CreateDateColumn()
  createdAt: Date;
}
