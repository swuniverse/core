import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SpaceLocation } from '../../starmap/entities/space-location.entity';
import { AnomalyType } from './anomaly-type.entity';

@Entity('anomalies')
@Index(['locationId'])
@Index(['parentId'])
export class Anomaly {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  typeId: number;

  @ManyToOne(() => AnomalyType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'typeId' })
  type: AnomalyType;

  @Column({ type: 'int', nullable: true })
  locationId: number | null;

  @ManyToOne(() => SpaceLocation, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'locationId' })
  location: SpaceLocation | null;

  @Column({ type: 'int', nullable: true })
  parentId: number | null;

  @ManyToOne(() => Anomaly, (anomaly) => anomaly.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Anomaly | null;

  @OneToMany(() => Anomaly, (anomaly) => anomaly.parent)
  children: Anomaly[];

  @Column({ type: 'int' })
  remainingTicks: number;

  @Column({ type: 'jsonb', nullable: true })
  data: unknown | null;
}
