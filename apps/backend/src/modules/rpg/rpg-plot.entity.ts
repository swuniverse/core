import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { RpgPlotMember } from './rpg-plot-member.entity';

@Entity('rpg_plots')
export class RpgPlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  creatorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @OneToMany(() => RpgPlotMember, (member) => member.plot)
  members: RpgPlotMember[];
}
