import { MigrationInterface, QueryRunner } from 'typeorm';
export class SeasonalAnomalies1794870000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `INSERT INTO anomaly_types (key) VALUES ('LIFE_DAY_GIFT'), ('SPRING_CAPSULE') ON CONFLICT (key) DO NOTHING`,
    );
    await q.query(
      `CREATE TABLE seasonal_anomaly_runs (key varchar(64) NOT NULL, year integer NOT NULL, PRIMARY KEY(key, year))`,
    );
    await q.query(`CREATE TABLE seasonal_anomaly_openings (
      id SERIAL PRIMARY KEY, "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key varchar(64) NOT NULL, day date NOT NULL, "anomalyId" integer NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_seasonal_gift_user_day" ON seasonal_anomaly_openings ("userId", day) WHERE key = 'LIFE_DAY_GIFT'`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "UQ_seasonal_capsule_anomaly" ON seasonal_anomaly_openings ("anomalyId") WHERE key = 'SPRING_CAPSULE'`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DELETE FROM anomalies WHERE "typeId" IN (SELECT id FROM anomaly_types WHERE key IN ('LIFE_DAY_GIFT', 'SPRING_CAPSULE'))`,
    );
    await q.query(
      `DELETE FROM anomaly_types WHERE key IN ('LIFE_DAY_GIFT', 'SPRING_CAPSULE')`,
    );
    await q.query(
      `DROP TABLE seasonal_anomaly_openings, seasonal_anomaly_runs`,
    );
  }
}
