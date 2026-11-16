import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Spacecraft } from './spacecraft.entity';
import type { ScrappingModule } from '../station-scrapping-rules';

@Entity('station_scrapping')
export class StationScrapping {
  @PrimaryColumn()
  stationId: number;

  @OneToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stationId' })
  station: Spacecraft;

  @Column()
  remainingTicks: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  modules: ScrappingModule[];
}
