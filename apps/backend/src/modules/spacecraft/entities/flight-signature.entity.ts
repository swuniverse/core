import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type FlightDirection = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

@Entity('flight_signatures')
@Index(['locationId', 'createdAt'])
@Index(['spacecraftId', 'createdAt'])
export class FlightSignature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  spacecraftId: number;

  @Column({ length: 255 })
  spacecraftName: string;

  @Column()
  shipClassId: number;

  @Column({ length: 255 })
  shipClassName: string;

  @Column()
  locationId: number;

  @Column({ type: 'varchar', length: 8, nullable: true })
  fromDirection: FlightDirection | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  toDirection: FlightDirection | null;

  @Column({ default: false })
  isCloaked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
