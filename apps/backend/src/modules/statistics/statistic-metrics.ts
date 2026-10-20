import type { DataSource } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import {
  COMBATS_EVENT,
  DESTROYED_SHIPS_EVENT,
  FLOWN_FIELDS_EVENT,
  PRIVATE_MESSAGES_EVENT,
} from './statistic-events';

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
const FLOWN_FIELDS_WINDOW_HOURS = 24;

/** Beginn der (UTC-)Stunde von `at`. */
export function hourOf(at: Date): Date {
  const hour = new Date(at);
  hour.setUTCMinutes(0, 0, 0);
  return hour;
}

/**
 * Summe je Ereignis aus den Stundenzeilen seit dem letzten Snapshot der
 * Kennzahl `metricKey` bis vor die aktuelle Stunde von `now`. Gezählt wird ab
 * der Stunde des letzten Snapshots (so geht nichts verloren, auch wenn
 * Haupttick-Stunden ausfallen); beim ersten Snapshot nur die letzte
 * abgeschlossene Stunde. Jedes Ereignis landet so genau einmal in einem
 * Snapshot. Ereignisse der laufenden Stunde zählen im nächsten Snapshot.
 */
async function countSinceLastSnapshot(
  dataSource: DataSource,
  metricKey: string,
  eventKeys: string[],
  now: Date,
): Promise<Record<string, number>> {
  const rows: Array<{ eventKey: string; total: number }> =
    await dataSource.query(
      `SELECT "metricKey" AS "eventKey", SUM("count")::float AS total
       FROM "statistic_hour_counters"
       WHERE "metricKey" = ANY($1)
         AND "hour" < ($2::timestamptz AT TIME ZONE 'UTC')
         AND "hour" >= COALESCE(
           (SELECT date_trunc('hour', MAX("recordedAt"))
            FROM "statistic_snapshots"
            WHERE "metricKey" = $3
              AND "recordedAt" < ($4::timestamptz AT TIME ZONE 'UTC')),
           ($2::timestamptz AT TIME ZONE 'UTC') - interval '1 hour')
       GROUP BY "metricKey"`,
      [eventKeys, hourOf(now), metricKey, now],
    );
  const totals: Record<string, number> = {};
  for (const eventKey of eventKeys) totals[eventKey] = 0;
  for (const row of rows) totals[row.eventKey] = Number(row.total);
  return totals;
}

// Zählt alle Users, auch Admins. Spieler ohne Fraktion fehlen dagegen in
// `players-by-faction`, die Summen beider Kennzahlen können also abweichen.
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

const FACTION_SERIES_DEFINITIONS = [
  { key: Faction.REBEL_ALLIANCE, label: 'Rebellenallianz' },
  { key: Faction.GALACTIC_EMPIRE, label: 'Galaktisches Imperium' },
];

/**
 * Bestandskennzahl, die Zeilen je Fraktion zählt. `table` ist die Tabelle mit
 * `ownerColumn` als Spieler-Verweis; Zeilen ohne Spieler (NPC, herrenlos)
 * oder ohne Fraktion erscheinen in keiner Serie.
 */
function perFactionMetric(
  key: string,
  title: string,
  table: string,
  ownerColumn: string,
): StatisticMetric {
  return {
    key,
    title,
    aggregation: 'last',
    series: FACTION_SERIES_DEFINITIONS,
    async capture(dataSource) {
      const rows: Array<{ faction: string; count: string }> =
        await dataSource.query(
          `SELECT f."key" AS faction, COUNT(*) AS count
           FROM "${table}" t
           JOIN "users" u ON u."id" = t."${ownerColumn}"
           JOIN "factions" f ON f."id" = u."factionId"
           GROUP BY f."key"`,
        );
      const values: Record<string, number> = {};
      for (const series of FACTION_SERIES_DEFINITIONS) values[series.key] = 0;
      for (const row of rows) values[row.faction] = Number(row.count);
      return values;
    },
  };
}

const playersByFactionMetric = perFactionMetric(
  'players-by-faction',
  'Spieler je Fraktion',
  'users',
  'id',
);

const discoveredSystemsMetric: StatisticMetric = {
  key: 'discovered-systems',
  title: 'Entdeckte Systeme',
  aggregation: 'last',
  series: [{ key: 'systems', label: 'Systementdeckungen' }],
  async capture(dataSource) {
    const [row] = await dataSource.query(
      `SELECT COUNT(*) AS systems FROM "system_explorations"`,
    );
    return { systems: Number(row.systems) };
  },
};

const alliancesMetric: StatisticMetric = {
  key: 'alliances',
  title: 'Allianzen',
  aggregation: 'last',
  series: [
    { key: 'count', label: 'Anzahl' },
    { key: 'avgMembers', label: 'Ø Mitglieder' },
  ],
  async capture(dataSource) {
    const [row] = await dataSource.query(
      `SELECT
         (SELECT COUNT(*) FROM "alliances") AS count,
         (SELECT COUNT(*) FROM "alliance_memberships") AS members`,
    );
    const count = Number(row.count);
    return {
      count,
      avgMembers: count
        ? Math.round((Number(row.members) / count) * 100) / 100
        : 0,
    };
  },
};

// Gesamtsumme statt Median: sie wächst monoton mit Aktivität und ist als
// Bestandswert über Zeit besser lesbar als eine robuste, aber träge Mitte.
const prestigeMetric: StatisticMetric = {
  key: 'prestige',
  title: 'Prestige',
  aggregation: 'last',
  series: [{ key: 'total', label: 'Gesamt' }],
  async capture(dataSource) {
    const [row] = await dataSource.query(
      `SELECT COALESCE(SUM("prestige"), 0) AS total FROM "users"`,
    );
    return { total: Number(row.total) };
  },
};

const holonetMetric: StatisticMetric = {
  key: 'holonet',
  title: 'Holonet',
  aggregation: 'last',
  series: [
    { key: 'posts', label: 'Beiträge' },
    { key: 'comments', label: 'Kommentare' },
  ],
  async capture(dataSource) {
    const [row] = await dataSource.query(
      `SELECT
         (SELECT COUNT(*) FROM "holonet_posts") AS posts,
         (SELECT COUNT(*) FROM "holonet_comments") AS comments`,
    );
    return { posts: Number(row.posts), comments: Number(row.comments) };
  },
};

const flownFieldsMetric: StatisticMetric = {
  key: 'flown-fields-24h',
  title: 'Geflogene Felder (24 h)',
  aggregation: 'last',
  series: [{ key: 'fields', label: 'Felder' }],
  async capture(dataSource, now) {
    const currentHour = hourOf(now);
    const [row] = await dataSource.query(
      `SELECT COALESCE(SUM("count"), 0)::float AS fields
       FROM "statistic_hour_counters"
       WHERE "metricKey" = $1
         AND "hour" > ($2::timestamptz AT TIME ZONE 'UTC')
         AND "hour" <= ($3::timestamptz AT TIME ZONE 'UTC')`,
      [
        FLOWN_FIELDS_EVENT,
        new Date(currentHour.getTime() - FLOWN_FIELDS_WINDOW_HOURS * 3_600_000),
        currentHour,
      ],
    );
    return { fields: Number(row.fields) };
  },
};

const combatMetric: StatisticMetric = {
  key: 'combat',
  title: 'Kampf',
  aggregation: 'sum',
  series: [
    { key: 'combats', label: 'Gefechte' },
    { key: 'destroyedShips', label: 'Zerstörte Schiffe' },
  ],
  async capture(dataSource, now) {
    const totals = await countSinceLastSnapshot(
      dataSource,
      'combat',
      [COMBATS_EVENT, DESTROYED_SHIPS_EVENT],
      now,
    );
    return {
      combats: totals[COMBATS_EVENT],
      destroyedShips: totals[DESTROYED_SHIPS_EVENT],
    };
  },
};

// Zuwachs aus den Stundenzeilen, nicht aus dem Bestand: Löschen verändert den
// Verlauf nicht.
const privateMessagesMetric: StatisticMetric = {
  key: 'private-messages',
  title: 'Privatnachrichten',
  aggregation: 'sum',
  series: [{ key: 'messages', label: 'Nachrichten' }],
  async capture(dataSource, now) {
    const totals = await countSinceLastSnapshot(
      dataSource,
      'private-messages',
      [PRIVATE_MESSAGES_EVENT],
      now,
    );
    return { messages: totals[PRIVATE_MESSAGES_EVENT] };
  },
};

/**
 * Register aller Statistiken. Eine neue Kennzahl entsteht durch einen
 * weiteren Eintrag; Erfassung, API und Anzeige übernehmen sie automatisch.
 */
export const STATISTIC_METRICS: StatisticMetric[] = [
  playersMetric,
  perFactionMetric(
    'ships-by-faction',
    'Schiffe nach Fraktion',
    'spacecraft',
    'userId',
  ),
  perFactionMetric(
    'colonies-by-faction',
    'Kolonien nach Fraktion',
    'colonies',
    'userId',
  ),
  playersByFactionMetric,
  discoveredSystemsMetric,
  alliancesMetric,
  prestigeMetric,
  holonetMetric,
  flownFieldsMetric,
  combatMetric,
  privateMessagesMetric,
];
