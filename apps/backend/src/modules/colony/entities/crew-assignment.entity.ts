import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Crew, CrewType } from './crew.entity';

@Entity('crew_assignments')
@Index(['userId'])
@Index(['colonyId'])
@Index(['spacecraftId'])
@Index(['escapePodId'])
@Index(['tradePostId'])
@Check(
  'CHK_crew_assignments_single_location',
  `num_nonnulls("colonyId", "spacecraftId", "escapePodId", "tradePostId") = 1`,
)
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

  /** Neutral escape pod holding the crew member; mutually exclusive with colony and ship. */
  @Column({ type: 'int', nullable: true })
  escapePodId!: number | null;

  /** Crew waiting for its owner at a trade post. */
  @Column({ type: 'int', nullable: true })
  tradePostId!: number | null;

  @Column({ type: 'varchar', nullable: true })
  slot!: CrewType | null;
}
