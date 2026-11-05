import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { HolonetPost } from './holonet-post.entity';
import { RpgPlot } from '../../rpg/rpg-plot.entity';

export enum PlotPostRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('plot_post_requests')
@Index('UQ_plot_post_requests_pending_post_plot', ['postId', 'plotId'], {
  unique: true,
  where: '"status" = \'PENDING\'',
})
@Index(['authorId', 'status', 'createdAt'])
export class PlotPostRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  postId: number;

  @ManyToOne(() => HolonetPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: HolonetPost;

  @Column({ type: 'integer' })
  plotId: number;

  @ManyToOne(() => RpgPlot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plotId' })
  plot: RpgPlot;

  @Column({ type: 'integer' })
  requesterId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column({ type: 'integer' })
  authorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'varchar', length: 16, default: PlotPostRequestStatus.PENDING })
  status: PlotPostRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
