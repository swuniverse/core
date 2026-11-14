import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Player blocked by an admin. Only a peppered hash of the email address is
 * kept; the row outlives the account so the address stays unusable.
 */
@Entity('blocked_users')
export class BlockedUser {
  @PrimaryColumn({ type: 'int' })
  userId: number;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  emailHash: string;

  @CreateDateColumn()
  blockedAt: Date;
}
