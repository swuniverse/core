import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MigrationFaction } from '../migration-shared';
import { FactionEntity } from './faction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 32 })
  username: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: MigrationFaction, nullable: true })
  faction: MigrationFaction | null;

  @Column({ type: 'int', nullable: true })
  factionId: number | null;

  @ManyToOne(() => FactionEntity, { nullable: true })
  @JoinColumn({ name: 'factionId' })
  factionRef: FactionEntity | null;

  @Column({ default: false })
  onboardingCompleted: boolean;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ type: 'int', nullable: true })
  starterColonyId: number | null;

  @Column({ type: 'int', nullable: true })
  starterShipId: number | null;

  @Column({ type: 'int', nullable: true })
  lastActiveTick: number | null;

  @Column({ default: 0 })
  prestige: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ nullable: true })
  refreshToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
