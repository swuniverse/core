import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';

@Entity('holonet_checkpoints')
export class HolonetCheckpoint {
  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', default: 0 })
  lastReadPostId: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
