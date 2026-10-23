import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('spacecraft')
export class MigrationSpacecraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 0 })
  reactorFuel: number;

  @Column({ default: 0 })
  reactorFuelMax: number;

  @Column({ default: 'SHIP' })
  kind: string;

  @Column({ type: 'varchar', nullable: true })
  stationRole: string | null;

  @Column({ type: 'int', nullable: true })
  dockedAtId: number | null;

  @Column({ default: 0 })
  dockCapacity: number;

  @Column({ default: 'NORMAL' })
  operatingMode: string;

  @Column({ default: 'DISABLED' })
  lssMode: string;
}
