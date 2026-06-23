import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Crew, CrewType } from './crew.entity';

@Entity('crew_assignments')
@Index(['userId'])
@Index(['colonyId'])
@Index(['spacecraftId'])
export class CrewAssignment {
  @PrimaryColumn()
  crewId!: number;

  @OneToOne(() => Crew, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crewId' })
  crew!: Crew;

  @Column()
  userId!: number;

  @Column({ type: 'int', nullable: true })
  colonyId!: number | null;

  @Column({ type: 'int', nullable: true })
  spacecraftId!: number | null;

  @Column({ type: 'varchar', nullable: true })
  slot!: CrewType | null;
}
