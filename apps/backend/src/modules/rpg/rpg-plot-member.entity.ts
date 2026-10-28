import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { RpgPlot } from './rpg-plot.entity';

@Entity('rpg_plot_members')
@Unique(['plotId', 'userId'])
export class RpgPlotMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  plotId: number;

  @ManyToOne(() => RpgPlot, (plot) => plot.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plotId' })
  plot: RpgPlot;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  joinedAt: Date;
}
