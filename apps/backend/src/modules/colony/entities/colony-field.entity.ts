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

  @Column({ nullable: true })
  buildingId: number | null;

  @Column({ default: false })
  isBuilding: boolean;

  @Column({ default: 0 })
  buildProgress: number;

  @Column({ nullable: true })
  buildFinishesAt: Date | null;
}
