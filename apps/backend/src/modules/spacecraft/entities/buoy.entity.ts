import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { SpacecraftBuoyDto } from '@swuniverse/shared';
import { User } from '../../auth/user.entity';
import { SpaceLocation } from '../../starmap/entities/space-location.entity';
import { Spacecraft } from './spacecraft.entity';

@Entity('spacecraft_buoys')
@Index(['userId'])
@Index(['locationId'])
export class Buoy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  spacecraftId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column()
  locationId: number;

  @ManyToOne(() => SpaceLocation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'locationId' })
  location: SpaceLocation;

  @Column({ type: 'varchar', length: 60 })
  text: string;

  @CreateDateColumn()
  createdAt: Date;
}

/** Requires the `user` relation. */
export function toBuoyDto(buoy: Buoy): SpacecraftBuoyDto {
  return {
    id: buoy.id,
    text: buoy.text,
    ownerId: buoy.userId,
    ownerName: buoy.user.username,
    createdAt: buoy.createdAt.toISOString(),
  };
}
