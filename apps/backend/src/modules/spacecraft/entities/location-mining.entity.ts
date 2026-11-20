import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/** STU `LocationMining`: finite stock of one commodity at one collection field. */
@Entity('location_mining')
@Unique(['locationId', 'commodityId'])
export class LocationMining {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  locationId: number;

  @Column()
  commodityId: number;

  @Column({ type: 'int' })
  actualAmount: number;

  @Column({ type: 'int' })
  maxAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  depletedAt: Date | null;
}
