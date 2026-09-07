import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../auth/user.entity';
import { CelestialObject } from '../../starmap/entities/celestial-object.entity';

@Entity('asteroid_resource_deposits')
export class AsteroidResourceDeposit {
  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @PrimaryColumn()
  celestialObjectId: number;

  @ManyToOne(() => CelestialObject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'celestialObjectId' })
  celestialObject: CelestialObject;

  @PrimaryColumn()
  commodityId: number;

  @Column()
  amountLeft: number;
}
