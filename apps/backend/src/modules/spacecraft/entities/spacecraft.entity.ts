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
import type { SpacecraftModule } from './spacecraft-module.entity';
import { Fleet } from './fleet.entity';
import { ShipClassDef } from './ship-class-def.entity';

export enum SpacecraftKind {
  SHIP = 'SHIP',
  STATION = 'STATION',
}

export enum StationRole {
  CONSTRUCTION = 'CONSTRUCTION',
  DEPOT_SMALL = 'DEPOT_SMALL',
  DEPOT_LARGE = 'DEPOT_LARGE',
  SHIPYARD = 'SHIPYARD',
  SENSOR = 'SENSOR',
  OUTPOST = 'OUTPOST',
  BASE = 'BASE',
}

export enum SpacecraftStatus {
  IDLE = 'IDLE',
  IN_COMBAT = 'IN_COMBAT',
  UNDER_CONSTRUCTION = 'UNDER_CONSTRUCTION',
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
export class Spacecraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column()
  shipClassId: number;

  @ManyToOne(() => ShipClassDef)
  @JoinColumn({ name: 'shipClassId' })
  shipClass: ShipClassDef;

  /** Original stored hull commodity for a lossless shuttle/Workbee round trip. */
  @Column({ type: 'int', nullable: true })
  shuttleCommodityId: number | null;

  @Column({ type: 'int', nullable: true })
  buildPlanId: number | null;

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

  @Column({ type: 'varchar', default: SpacecraftKind.SHIP })
  kind: SpacecraftKind;

  @Column({ type: 'varchar', nullable: true })
  stationRole: StationRole | null;

  @Column({ type: 'int', nullable: true })
  dockedAtId: number | null;

  @ManyToOne(() => Spacecraft, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dockedAtId' })
  dockedAt: Spacecraft | null;

  @Column({ type: 'int', nullable: true, unique: true })
  tractoredShipId: number | null;

  @ManyToOne(() => Spacecraft, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tractoredShipId' })
  tractoredShip: Spacecraft | null;

  @Column({ default: 0 })
  dockCapacity: number;

  /** Station owner setting: foreign-docking notices arrive already read. */
  @Column({ default: false })
  dockPmAutoRead: boolean;

  /** Station setting: the tick tops up the station's own backup battery from newly produced EPS (STU `reloadBattery`). */
  @Column({ default: false })
  reloadBattery: boolean;

  /** Station repairs itself passively from its own spare parts while enough workbees are docked. */
  @Column({ default: false })
  passiveRepair: boolean;

  @Column({ default: 0 })
  constructionTicksRemaining: number;

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

  @Column({ type: 'int', nullable: true })
  analyzedFlightSignatureId: number | null;

  /** Wall-clock outage caused by a short-range sensor field malfunction. */
  @Column({ type: 'timestamp', nullable: true })
  shortRangeSensorsCooldownUntil: Date | null;

  @Column({ type: 'varchar', length: 6, nullable: true })
  lastGalaxyFlightDirection: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | null;

  @Column({ default: 0 })
  evadeChance: number;

  @Column({ default: 100 })
  reactorWarpSplit: number;

  @Column({ default: false })
  reactorAutoCarryOver: boolean;

  @Column({ type: 'int', nullable: true })
  fleetId: number | null;

  @ManyToOne(() => Fleet, (f) => f.members, { nullable: true })
  @JoinColumn({ name: 'fleetId' })
  fleet: Fleet | null;

  @OneToMany(
    () => require('./spacecraft-module.entity').SpacecraftModule,
    (module: SpacecraftModule) => module.spacecraft,
    { eager: false },
  )
  modules: SpacecraftModule[];

  @CreateDateColumn()
  createdAt: Date;
}
