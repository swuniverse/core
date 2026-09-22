import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SpaceLocation } from '../../starmap/entities/space-location.entity';

@Entity('spacecraft_wrecks')
@Index(['locationId'])
export class SpacecraftWreck {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  formerShipClassId: number;

  @Column({ type: 'int' })
  locationId: number;

  @ManyToOne(() => SpaceLocation, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'locationId' })
  location: SpaceLocation;

  @Column()
  hull: number;

  @Column({ default: 0 })
  crewCount: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  cargo: Array<{ commodityId: number; amount: number }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  torpedoes: Array<{
    torpedoTypeId: number;
    commodityId: number;
    amount: number;
  }>;

  @CreateDateColumn()
  createdAt: Date;
}
