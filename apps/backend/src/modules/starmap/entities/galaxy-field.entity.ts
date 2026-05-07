import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Layer } from './layer.entity';
import { StarSystem } from './star-system.entity';
import { GalaxyFieldType } from './galaxy-field-type.entity';

export enum FactionZone {
  REBEL = 'REBEL',
  EMPIRE = 'EMPIRE',
  CONTESTED = 'CONTESTED',
  UNKNOWN = 'UNKNOWN',
  NEUTRAL = 'NEUTRAL',
}

@Entity('galaxy_fields')
@Index(['layerId', 'cx', 'cy'], { unique: true })
@Index(['layerId', 'factionZone'])
@Index(['starSystemId'])
export class GalaxyField {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  layerId: number;

  @ManyToOne(() => Layer)
  @JoinColumn({ name: 'layerId' })
  layer: Layer;

  @Column()
  cx: number;

  @Column()
  cy: number;

  @Column()
  fieldTypeId: number;

  @ManyToOne(() => GalaxyFieldType)
  @JoinColumn({ name: 'fieldTypeId' })
  fieldType: GalaxyFieldType;

  @Column({
    type: 'varchar',
    length: 16,
    default: FactionZone.UNKNOWN,
  })
  factionZone: FactionZone;

  @Column({ type: 'int', nullable: true })
  starSystemId: number | null;

  @ManyToOne(() => StarSystem, { nullable: true })
  @JoinColumn({ name: 'starSystemId' })
  starSystem: StarSystem | null;

  @Column({ default: true })
  isPassable: boolean;

  @Column({ default: 1 })
  energyCost: number;

  @Column({ default: 0 })
  damage: number;

  @Column({ type: 'simple-json', nullable: true })
  effectFlags: string[] | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  adminRegionKey: string | null;
}
