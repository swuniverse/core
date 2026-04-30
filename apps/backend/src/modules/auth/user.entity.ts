import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Faction } from '@swuniverse/shared';

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

  @Column({ type: 'enum', enum: Faction })
  faction: Faction;

  @Column({ default: 0 })
  prestige: number;

  @Column({ nullable: true })
  refreshToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
