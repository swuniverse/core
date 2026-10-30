import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Spacecraft } from './spacecraft.entity';

/** One docked ship waiting for or undergoing passive repair at a station (STU `StationShipRepair`). */
@Entity('station_ship_repairs')
@Index(['stationId'])
export class StationShipRepair {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  stationId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stationId' })
  station: Spacecraft;

  @Column({ type: 'int', unique: true })
  shipId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipId' })
  ship: Spacecraft;

  /** Null while the job waits in the queue and has not started its first step. */
  @Column({ type: 'timestamp', nullable: true })
  finishesAt: Date | null;

  /** Set while the job is paused; the pause time is added to `finishesAt` on resume. */
  @Column({ type: 'timestamp', nullable: true })
  stoppedAt: Date | null;

  /** The whole queue halted because the station lacks spare parts; resumed manually. */
  @Column({ default: false })
  isStopped: boolean;
}
