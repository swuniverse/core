import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Anzahl eines Ereignisses (Kennzahl) in einer vollen Stunde. */
@Entity('statistic_hour_counters')
export class StatisticHourCounter {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  metricKey: string;

  @PrimaryColumn({ type: 'timestamp' })
  hour: Date;

  @Column({ type: 'bigint', transformer: { to: Number, from: Number } })
  count: number;
}
