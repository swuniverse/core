import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GalaxyField } from './galaxy-field.entity';
import { SystemField } from './system-field.entity';

export enum SpaceLocationKind {
  GALAXY_FIELD = 'GALAXY_FIELD',
  SYSTEM_FIELD = 'SYSTEM_FIELD',
}

@Entity('space_locations')
@Check(
  'CHK_space_locations_field_kind',
  `("kind" = 'GALAXY_FIELD' AND "galaxyFieldId" IS NOT NULL AND "systemFieldId" IS NULL) OR ("kind" = 'SYSTEM_FIELD' AND "galaxyFieldId" IS NULL AND "systemFieldId" IS NOT NULL)`,
)
@Index(['galaxyFieldId'], { unique: true })
@Index(['systemFieldId'], { unique: true })
export class SpaceLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 16 })
  kind: SpaceLocationKind;

  @Column({ type: 'int', nullable: true })
  galaxyFieldId: number | null;

  @ManyToOne(() => GalaxyField, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'galaxyFieldId' })
  galaxyField: GalaxyField | null;

  @Column({ type: 'int', nullable: true })
  systemFieldId: number | null;

  @ManyToOne(() => SystemField, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'systemFieldId' })
  systemField: SystemField | null;
}
