import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { StarSystem } from '../../starmap/entities/star-system.entity';
import { CelestialObject } from '../../starmap/entities/celestial-object.entity';
import { Layer } from '../../starmap/entities/layer.entity';
import { SpacecraftModule } from './spacecraft-module.entity';
import { Fleet } from './fleet.entity';

export enum SpacecraftStatus {
  DOCKED = 'DOCKED',
  IN_FLIGHT = 'IN_FLIGHT',
  IN_COMBAT = 'IN_COMBAT',
  DESTROYED = 'DESTROYED',
}

export enum AlertState {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

@Entity('spacecraft')
@Index(['userId'])
@Index(['starSystemId'])
export class Spacecraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column()
  shipClassId: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', nullable: true })
  starSystemId: number | null;

  @ManyToOne(() => StarSystem, { nullable: true })
  @JoinColumn({ name: 'starSystemId' })
  starSystem: StarSystem;

  @Column({ type: 'int', nullable: true })
  currentLayerId: number | null;

  @ManyToOne(() => Layer, { nullable: true })
  @JoinColumn({ name: 'currentLayerId' })
  currentLayer: Layer | null;

  @Column({ type: 'int', nullable: true })
  celestialObjectId: number | null;

  @ManyToOne(() => CelestialObject, { nullable: true })
  @JoinColumn({ name: 'celestialObjectId' })
  celestialObject: CelestialObject | null;

  @Column({ default: false })
  inSystem: boolean;

  @Column({ type: 'int', nullable: true })
  currentSystemFieldX: number | null;

  @Column({ type: 'int', nullable: true })
  currentSystemFieldY: number | null;

  @Column({ default: 10 })
  posX: number;

  @Column({ default: 10 })
  posY: number;

  @Column({ type: 'varchar', default: SpacecraftStatus.DOCKED })
  status: SpacecraftStatus;

  @Column({ type: 'varchar', default: AlertState.GREEN })
  alertState: AlertState;

  // Hull
  @Column({ default: 100 })
  hull: number;

  @Column({ default: 100 })
  hullMax: number;

  // Shields
  @Column({ default: 50 })
  shields: number;

  @Column({ default: 50 })
  shieldsMax: number;

  // Energy
  @Column({ default: 100 })
  energy: number;

  @Column({ default: 100 })
  energyMax: number;

  // Warp
  @Column({ default: 2 })
  warpSpeed: number;

  @Column({ default: 0 })
  warpCooldown: number;

  // Crew
  @Column({ default: 10 })
  crew: number;

  @Column({ default: 20 })
  crewMax: number;

  @Column({ default: 0 })
  cargoUsed: number;

  @Column({ default: 0 })
  cargoMax: number;

  @Column({ default: 0 })
  battery: number;

  @Column({ default: 0 })
  batteryMax: number;

  @Column({ default: 0 })
  epsMax: number;

  @Column({ default: 0 })
  reactorOutput: number;

  @Column({ default: 0 })
  warpdriveMax: number;
  @Column({ default: 0 })
  warpdrive: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  runtimeSystems: Record<string, unknown>;

  @Column({ default: 0 })
  evadeChance: number;

  // Navigation target (for in-flight)
  @Column({ type: 'int', nullable: true })
  targetSystemId: number | null;

  @Column({ type: 'int', nullable: true })
  targetX: number | null;

  @Column({ type: 'int', nullable: true })
  targetY: number | null;

  @Column({ type: 'timestamp', nullable: true })
  arrivalAt: Date | null;

  @Column({ type: 'int', nullable: true })
  fleetId: number | null;

  @ManyToOne(() => Fleet, (f) => f.members, { nullable: true })
  @JoinColumn({ name: 'fleetId' })
  fleet: Fleet | null;

  @OneToMany(() => SpacecraftModule, (m) => m.spacecraft, { eager: false })
  modules: SpacecraftModule[];

  @CreateDateColumn()
  createdAt: Date;
}
