import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/user.entity';

/** STU `LotteryTicket`: one ticket of a monthly period `YYYY.MM`. */
@Entity('lottery_tickets')
@Index(['period', 'userId'])
export class LotteryTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 7 })
  period: string;

  /** `null` until the period is drawn. */
  @Column({ type: 'boolean', nullable: true })
  isWinner: boolean | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
