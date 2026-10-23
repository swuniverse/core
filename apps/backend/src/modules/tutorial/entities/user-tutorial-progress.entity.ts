import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { TutorialView } from '@swuniverse/shared';
import { User } from '../../auth/user.entity';

@Entity('user_tutorial_progress')
export class UserTutorialProgress {
  @PrimaryColumn({ type: 'int' })
  userId: number;

  @PrimaryColumn({ type: 'varchar', length: 32 })
  view: TutorialView;

  @Column({ type: 'varchar', length: 64, nullable: true })
  currentStepId: string | null;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
