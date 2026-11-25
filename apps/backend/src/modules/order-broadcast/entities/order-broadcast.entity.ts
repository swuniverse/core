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

  @CreateDateColumn()
  createdAt: Date;
}
