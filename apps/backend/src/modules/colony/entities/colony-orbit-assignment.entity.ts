import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Colony } from './colony.entity';
import { Spacecraft } from '../../spacecraft/entities/spacecraft.entity';
import { Fleet } from '../../spacecraft/entities/fleet.entity';

export enum ColonyOrbitAssignmentMode {
  DEFEND = 'DEFEND',
  BLOCKADE = 'BLOCKADE',
}

@Entity('colony_orbit_assignments')
@Index(['colonyId', 'mode'])
@Index(['fleetId'], { unique: true })
@Index(['spacecraftId'], { unique: true })
export class ColonyOrbitAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  colonyId: number;

  @ManyToOne(() => Colony, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colonyId' })
  colony: Colony;

  @Column()
  spacecraftId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column()
  fleetId: number;

  @ManyToOne(() => Fleet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fleetId' })
  fleet: Fleet;

  @Column({ type: 'varchar', length: 16 })
  mode: ColonyOrbitAssignmentMode;

  @CreateDateColumn()
  createdAt: Date;
}
