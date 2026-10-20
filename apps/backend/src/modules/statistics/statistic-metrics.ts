import type { DataSource } from 'typeorm';

/**
 * Wie die Snapshots einer Kennzahl zu einem Bucket (Täglich, Wöchentlich,
 * Monatlich) zusammengefasst werden: `last` für Bestandswerte, `sum` für
 * Zuwächse je Haupttick.
 */
export type StatisticAggregation = 'last' | 'sum';

export interface StatisticMetric {
  key: string;
  title: string;
  aggregation: StatisticAggregation;
  series: Array<{ key: string; label: string }>;
  /** Liefert je Serienschlüssel den Wert zum Messzeitpunkt `now`. */
  capture(dataSource: DataSource, now: Date): Promise<Record<string, number>>;
}

const ACTIVE_WINDOW_MS = 24 * 3_600_000;

const playersMetric: StatisticMetric = {
  key: 'players',
  title: 'Spieler',
  aggregation: 'last',
  series: [
    { key: 'active', label: 'Aktiv (24 h)' },
    { key: 'inactive', label: 'Inaktiv' },
    { key: 'vacation', label: 'Urlaub' },
  ],
  async capture(dataSource, now) {
    const [row] = await dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE NOT "vacationMode" AND "lastActiveAt" >= $1)::int AS active,
         COUNT(*) FILTER (WHERE NOT "vacationMode" AND ("lastActiveAt" IS NULL OR "lastActiveAt" < $1))::int AS inactive,
         COUNT(*) FILTER (WHERE "vacationMode")::int AS vacation
       FROM "users"`,
      [new Date(now.getTime() - ACTIVE_WINDOW_MS)],
    );
    return {
      active: Number(row.active),
      inactive: Number(row.inactive),
      vacation: Number(row.vacation),
    };
  },
};

/**
 * Register aller Statistiken. Eine neue Kennzahl entsteht durch einen
 * weiteren Eintrag; Erfassung, API und Anzeige übernehmen sie automatisch.
 */
export const STATISTIC_METRICS: StatisticMetric[] = [playersMetric];
