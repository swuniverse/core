import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Idempotency record: each gift ship is handed to a player at most once. */
@Entity('ship_gifts')
@Index(['userId', 'giftKey'], { unique: true })
export class ShipGift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar' })
  giftKey: string;

  @Column({ type: 'int', nullable: true })
  spacecraftId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
