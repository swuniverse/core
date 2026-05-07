import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StarSystem } from './star-system.entity';
import { CelestialObject } from './celestial-object.entity';
import { GalaxyFieldType } from './galaxy-field-type.entity';

@Entity('system_fields')
@Index(['starSystemId', 'sx', 'sy'], { unique: true })
export class SystemField {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  starSystemId: number;

  @ManyToOne(() => StarSystem)
  @JoinColumn({ name: 'starSystemId' })
  starSystem: StarSystem;

  @Column()
  sx: number;

  @Column()
  sy: number;

  @Column()
  fieldTypeId: number;

  @ManyToOne(() => GalaxyFieldType)
  @JoinColumn({ name: 'fieldTypeId' })
  fieldType: GalaxyFieldType;

  @Column({ type: 'int', nullable: true })
  celestialObjectId: number | null;

  @ManyToOne(() => CelestialObject, { nullable: true })
  @JoinColumn({ name: 'celestialObjectId' })
  celestialObject: CelestialObject | null;

  @Column({ default: true })
  isPassable: boolean;

  @Column({ default: 1 })
  energyCost: number;

  @Column({ default: 0 })
  damage: number;

  @Column({ type: 'simple-json', nullable: true })
  effects: string[] | null;
}
