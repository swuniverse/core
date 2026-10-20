import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Wert einer Serie einer Statistik zum Zeitpunkt eines Haupttick. */
@Entity('statistic_snapshots')
@Index(['metricKey', 'seriesKey', 'recordedAt'], { unique: true })
@Index(['metricKey', 'recordedAt'])
export class StatisticSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  metricKey: string;

  @Column({ type: 'varchar', length: 64 })
  seriesKey: string;

  @Column({ type: 'timestamp' })
  recordedAt: Date;

  @Column({ type: 'double precision' })
  value: number;
}
