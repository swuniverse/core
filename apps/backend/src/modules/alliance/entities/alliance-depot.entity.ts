import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Spacecraft } from '../../spacecraft/entities/spacecraft.entity';
import { User } from '../../auth/user.entity';
import { Alliance } from './alliance.entity';

@Entity('alliance_depots')
@Index('IDX_alliance_depots_alliance_owner', ['allianceId', 'ownerUserId'])
export class AllianceDepot {
  @PrimaryColumn()
  stationId: number;

  @OneToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stationId' })
  station: Spacecraft;

  @Column()
  allianceId: number;

  @ManyToOne(() => Alliance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'allianceId' })
  alliance: Alliance;

  @Column()
  ownerUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User;
}
