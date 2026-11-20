import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { MaintenanceHandler } from '../tick/maintenance.service';

const RECREATION_COOLDOWN_MS = 20 * 24 * 60 * 60 * 1000;

/**
 * STU `CreateInterstellarMedia`: fields depleted for 20 days regrow from 0 to
 * 5 % of max (at least 1), otherwise by 15 %, until max clears `depletedAt`.
 */
@Injectable()
export class LocationMiningRegenerationService implements MaintenanceHandler {
  readonly name = 'location-mining-regeneration';

  constructor(private readonly dataSource: DataSource) {}

  async run(now: Date): Promise<string> {
    // Single UPDATE: PostgreSQL re-reads rows a collector changed meanwhile.
    const next = `LEAST("maxAmount", CASE WHEN "actualAmount" = 0
      THEN GREATEST(1, CEIL("maxAmount" * 0.05)::int)
      ELSE CEIL("actualAmount" * 1.15)::int END)`;
    const [, affected] = (await this.dataSource.query(
      `UPDATE "location_mining"
          SET "actualAmount" = ${next},
              "depletedAt" = CASE WHEN ${next} >= "maxAmount" THEN NULL ELSE "depletedAt" END
        WHERE "depletedAt" <= $1 AND "actualAmount" < "maxAmount"`,
      [new Date(now.getTime() - RECREATION_COOLDOWN_MS)],
    )) as [unknown, number];
    return `${affected} Sammelfelder regeneriert`;
  }
}
