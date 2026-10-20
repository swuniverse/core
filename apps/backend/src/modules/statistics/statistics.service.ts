import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  StatisticDto,
  StatisticPointDto,
  StatisticUnit,
  StatisticsResponseDto,
} from '@swuniverse/shared';
import { hourOf, type StatisticMetric } from './statistic-metrics';

export const STATISTIC_METRICS_TOKEN = 'STATISTIC_METRICS';

const UNIT_BUCKET: Record<
  StatisticUnit,
  { trunc: string | null; limit: number }
> = {
  tick: { trunc: null, limit: 48 },
  daily: { trunc: 'day', limit: 30 },
  weekly: { trunc: 'week', limit: 30 },
  monthly: { trunc: 'month', limit: 30 },
};

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(STATISTIC_METRICS_TOKEN)
    private readonly metrics: StatisticMetric[],
  ) {}

  /**
   * Schreibt je Kennzahl einen Snapshot für den Haupttick `at`. Fehler einer
   * Kennzahl werden protokolliert und stoppen weder die übrigen Kennzahlen
   * noch den Haupttick. Ein wiederholter Lauf für denselben Zeitpunkt ist
   * wirkungslos.
   */
  async recordSnapshots(at: Date): Promise<void> {
    for (const metric of this.metrics) {
      try {
        const values = await metric.capture(this.dataSource, at);
        for (const series of metric.series) {
          await this.dataSource.query(
            `INSERT INTO "statistic_snapshots" ("metricKey", "seriesKey", "recordedAt", "value")
             VALUES ($1, $2, $3::timestamptz AT TIME ZONE 'UTC', $4)
             ON CONFLICT ("metricKey", "seriesKey", "recordedAt") DO NOTHING`,
            [metric.key, series.key, at, values[series.key] ?? 0],
          );
        }
      } catch (error) {
        this.logger.error(
          `Statistic ${metric.key} could not be recorded`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  /**
   * Zählt ein Ereignis `amount`-mal in der Stunde von `at` hoch (atomar per
   * UPSERT). Fehler werden protokolliert und nie weitergereicht, damit die
   * zählende Aktion nicht an der Statistik scheitert.
   */
  async countEvent(
    metricKey: string,
    amount = 1,
    at: Date = new Date(),
  ): Promise<void> {
    if (!(amount > 0)) return;
    try {
      const hour = hourOf(at);
      await this.dataSource.query(
        `INSERT INTO "statistic_hour_counters" ("metricKey", "hour", "count")
         VALUES ($1, $2::timestamptz AT TIME ZONE 'UTC', $3)
         ON CONFLICT ("metricKey", "hour")
         DO UPDATE SET "count" = "statistic_hour_counters"."count" + EXCLUDED."count"`,
        [metricKey, hour, amount],
      );
    } catch (error) {
      this.logger.error(
        `Event ${metricKey} could not be counted`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async getStatistics(unit: StatisticUnit): Promise<StatisticsResponseDto> {
    const results = await Promise.all(
      this.metrics.map((metric) => this.readMetricSafely(metric, unit)),
    );
    const metrics = results.filter((dto): dto is StatisticDto => dto !== null);
    return { unit, metrics };
  }

  /** Eine defekte Kennzahl wird protokolliert und übersprungen. */
  private async readMetricSafely(
    metric: StatisticMetric,
    unit: StatisticUnit,
  ): Promise<StatisticDto | null> {
    try {
      return await this.readMetric(metric, unit);
    } catch (error) {
      this.logger.error(
        `Statistic ${metric.key} could not be read`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  private async readMetric(
    metric: StatisticMetric,
    unit: StatisticUnit,
  ): Promise<StatisticDto> {
    const { trunc, limit } = UNIT_BUCKET[unit];
    // trunc stammt aus der festen Tabelle oben, nie aus Nutzereingaben.
    // Zeitstempel liegen als UTC-Wanduhrzeit vor; Buckets werden explizit in
    // UTC gebildet und als timestamptz geliefert, unabhängig von der
    // Zeitzone von Datenbanksitzung und Server.
    const bucket = trunc
      ? `date_trunc('${trunc}', "recordedAt") AT TIME ZONE 'UTC'`
      : `"recordedAt" AT TIME ZONE 'UTC'`;
    const value =
      metric.aggregation === 'sum'
        ? 'SUM("value")'
        : '(ARRAY_AGG("value" ORDER BY "recordedAt" DESC))[1]';
    const rows: Array<{ bucket: Date; seriesKey: string; value: number }> =
      await this.dataSource.query(
        `WITH s AS (
           SELECT "seriesKey", ${bucket} AS bucket, "recordedAt", "value"
           FROM "statistic_snapshots"
           WHERE "metricKey" = $1
         ), latest AS (
           SELECT DISTINCT bucket FROM s ORDER BY bucket DESC LIMIT $2
         )
         SELECT bucket, "seriesKey", ${value} AS value
         FROM s
         WHERE bucket IN (SELECT bucket FROM latest)
         GROUP BY bucket, "seriesKey"
         ORDER BY bucket ASC`,
        [metric.key, limit],
      );

    const points = new Map<number, StatisticPointDto>();
    for (const row of rows) {
      const time = row.bucket.getTime();
      const point = points.get(time) ?? {
        t: row.bucket.toISOString(),
        values: {},
      };
      point.values[row.seriesKey] = Number(row.value);
      points.set(time, point);
    }
    return {
      key: metric.key,
      title: metric.title,
      series: metric.series.map(({ key, label }) => ({ key, label })),
      points: [...points.values()],
    };
  }
}
