import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Crew, CrewType } from '../../colony/entities/crew.entity';

@Entity('crew_skills')
export class CrewSkill {
  @PrimaryColumn()
  crewId!: number;

  @PrimaryColumn({ type: 'varchar' })
  position!: CrewType;

  @Column({ type: 'int', default: 0 })
  expertise!: number;

  @ManyToOne(() => Crew, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crewId' })
  crew!: Crew;
}
