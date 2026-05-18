import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/user.entity';

@Entity('user_settings')
export class UserSetting {
  @PrimaryColumn()
  userId: number;

  @PrimaryColumn({ length: 64 })
  key: string;

  @Column({ length: 255 })
  value: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
