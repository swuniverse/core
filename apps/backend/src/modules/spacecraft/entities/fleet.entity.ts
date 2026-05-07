import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { Spacecraft } from './spacecraft.entity';

@Entity('fleets')
@Index(['userId'])
export class Fleet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  leaderId: number;

  @OneToMany(() => Spacecraft, (s) => s.fleet)
  members: Spacecraft[];

  @CreateDateColumn()
  createdAt: Date;
}
