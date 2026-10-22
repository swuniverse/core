import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AccountTokenPurpose {
  PasswordReset = 'PASSWORD_RESET',
  EmailVerification = 'EMAIL_VERIFICATION',
  AccountDeletion = 'ACCOUNT_DELETION',
}

@Entity('account_tokens')
@Index(['userId', 'purpose', 'createdAt'])
export class AccountToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: AccountTokenPurpose })
  purpose: AccountTokenPurpose;

  @Index({ unique: true })
  @Column({ length: 64 })
  tokenHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
