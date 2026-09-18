import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('spacecraft')
export class MigrationSpacecraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 0 })
  reactorFuel: number;

  @Column({ default: 0 })
  reactorFuelMax: number;

  @Column({ default: 'NORMAL' })
  operatingMode: string;

  @Column({ default: 'DISABLED' })
  lssMode: string;
}
