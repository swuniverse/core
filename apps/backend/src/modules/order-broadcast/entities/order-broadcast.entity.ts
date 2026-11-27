import type { Faction } from '@swuniverse/shared';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('order_broadcasts')
export class OrderBroadcast {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  message: string;

  /** Null = for everyone; otherwise only this player receives it. */
  @Column({ type: 'int', nullable: true })
  targetUserId: number | null;

  /** Null = all factions; otherwise only players of this faction receive it. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  targetFaction: Faction | null;

  @CreateDateColumn()
  createdAt: Date;
}
