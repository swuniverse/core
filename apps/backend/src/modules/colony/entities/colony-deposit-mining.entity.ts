import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Colony } from './colony.entity';
import { User } from '../../auth/user.entity';

@Entity('colony_deposit_mining')
export class ColonyDepositMining {
  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @PrimaryColumn()
  colonyId: number;

  @ManyToOne(() => Colony, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colonyId' })
  colony: Colony;

  @PrimaryColumn()
  commodityId: number;

  @Column()
  amountLeft: number;
}
