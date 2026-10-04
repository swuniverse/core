import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Colony } from './colony.entity';

@Entity('colony_fields')
@Index(['colonyId', 'fieldIndex'], { unique: true })
export class ColonyField {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  colonyId: number;

  @ManyToOne(() => Colony, (colony) => colony.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colonyId' })
  colony: Colony;

  @Column()
  fieldIndex: number;

  @Column()
  fieldType: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  terrainTileId: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  layer: 'ORBIT' | 'SURFACE' | 'UNDERGROUND' | null;

  /** SWU planetarer Bonus-Marker (siehe swu-bonus-markers.ts), null = keiner. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  bonusMarker: string | null;

  @Column({ type: 'int', nullable: true })
  buildingId: number | null;

  @Column({ default: false })
  isBuilding: boolean;

  @Column({ default: 0 })
  buildProgress: number;

  @Column({ type: 'timestamp', nullable: true })
  buildFinishesAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  integrity: number;

  @Column({ default: 0 })
  maxIntegrity: number;

  @Column({ default: true })
  activateAfterBuild: boolean;

  @Column({ type: 'int', nullable: true })
  reactivateAfterUpgrade: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  terraformingId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  terraformingFinishesAt: Date | null;
}
