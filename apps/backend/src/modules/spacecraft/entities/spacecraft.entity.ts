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
import { SpaceLocation } from '../../starmap/entities/space-location.entity';
import { SpacecraftModule } from './spacecraft-module.entity';
import { Fleet } from './fleet.entity';

export enum SpacecraftStatus {
  IDLE = 'IDLE',
  IN_FLIGHT = 'IN_FLIGHT',
  IN_COMBAT = 'IN_COMBAT',
  DESTROYED = 'DESTROYED',
}

export enum AlertState {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export enum SpacecraftOperatingMode {
  NORMAL = 'NORMAL',
  STANDBY = 'STANDBY',
}

export enum SpacecraftLssMode {
  DISABLED = 'DISABLED',
  TERRITORY = 'TERRITORY',
  IMPASSABLE = 'IMPASSABLE',
  CARTOGRAPHY = 'CARTOGRAPHY',
}

@Entity('spacecraft')
@Index(['userId'])
@Index(['locationId'])
@Index(['originLocationId'])
@Index(['targetLocationId'])
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

  @Column({ type: 'int' })
  locationId: number;

  @ManyToOne(() => SpaceLocation, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'locationId' })
  location: SpaceLocation;

  @Column({ type: 'varchar', default: SpacecraftStatus.IDLE })
  status: SpacecraftStatus;

  @Column({ type: 'varchar', default: AlertState.GREEN })
  alertState: AlertState;

  @Column({ type: 'varchar', default: SpacecraftOperatingMode.NORMAL })
  operatingMode: SpacecraftOperatingMode;

  @Column({ type: 'varchar', default: SpacecraftLssMode.DISABLED })
  lssMode: SpacecraftLssMode;

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
  crewRequired: number;

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

  /** Deuterium reserve consumed by explicit reactor loading; commodity id 5. */
  @Column({ default: 0 })
  reactorFuel: number;

  @Column({ default: 0 })
  reactorFuelMax: number;

  @Column({ default: 0 })
  warpdriveMax: number;
  @Column({ default: 0 })
  warpdrive: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  runtimeSystems: Record<string, unknown>;

  @Column({ type: 'varchar', length: 6, nullable: true })
  lastGalaxyFlightDirection: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | null;

  @Column({ default: 0 })
  evadeChance: number;

  @Column({ default: 100 })
  reactorWarpSplit: number;

  @Column({ default: false })
  reactorAutoCarryOver: boolean;

  @Column({ type: 'timestamp', nullable: true })
  arrivalAt: Date | null;

  @Column({ type: 'int', nullable: true })
  originLocationId: number | null;

  @ManyToOne(() => SpaceLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'originLocationId' })
  originLocation: SpaceLocation | null;

  @Column({ type: 'int', nullable: true })
  targetLocationId: number | null;

  @ManyToOne(() => SpaceLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetLocationId' })
  targetLocation: SpaceLocation | null;

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
