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
import { User } from './user.entity';

export enum InviteKeyStatus {
  Available = 'available',
  Used = 'used',
  Revoked = 'revoked',
}

@Entity('invite_keys')
export class InviteKey {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 128 })
  keyHash: string;

  @Column({ length: 32 })
  keyPreview: string;

  @Column({ type: 'varchar', length: 16, default: InviteKeyStatus.Available })
  status: InviteKeyStatus;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User | null;

  @Column({ type: 'int', nullable: true })
  ownerUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerUserId' })
  ownerUser: User | null;

  @Column({ type: 'int', nullable: true })
  usedByUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usedByUserId' })
  usedByUser: User | null;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
