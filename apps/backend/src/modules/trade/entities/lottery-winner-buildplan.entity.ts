import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** STU `LotteryWinnerBuildplan`: a possible prize ship of a faction, weighted by chance. */
@Entity('lottery_winner_buildplans')
@Index(['factionId'])
@Check('CHK_lottery_winner_buildplans_chance', '"chance" > 0')
export class LotteryWinnerBuildplan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  factionId: number;

  @Column({ type: 'int' })
  buildplanId: number;

  @Column({ type: 'int' })
  chance: number;
}
