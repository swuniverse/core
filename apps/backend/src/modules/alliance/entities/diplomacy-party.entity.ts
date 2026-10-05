import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { Alliance } from './alliance.entity';

/**
 * A party is deliberately independent from a relationship so later stages can
 * add alliance-less players without changing the relationship schema.
 */
@Entity('diplomacy_parties')
export class DiplomacyParty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  allianceId: number | null;

  @ManyToOne(() => Alliance, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'allianceId' })
  alliance: Alliance | null;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;
}
