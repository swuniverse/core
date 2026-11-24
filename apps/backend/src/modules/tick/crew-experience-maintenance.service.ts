import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isVacationEffective } from '@swuniverse/shared';
import { CrewEnhancementService } from '../spacecraft/crew-enhancement.service';
import { CrewEnhancementEvent } from '../spacecraft/crew-expertise';
import type { MaintenanceHandler } from './maintenance.service';

const BATCH_SIZE = 500;

/**
 * STU `MaintenanceCrewExperienceHandler`: daily `MAINTENANCE_TICK` for every
 * player spacecraft with crew aboard whose owner is not in effective vacation.
 * Ships without crew gain nothing in STU either, so they are not selected.
 */
@Injectable()
export class CrewExperienceMaintenanceService implements MaintenanceHandler {
  readonly name = 'crew-experience';
  private readonly logger = new Logger(CrewExperienceMaintenanceService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly crewEnhancement: CrewEnhancementService,
  ) {}

  async run(now: Date): Promise<string> {
    let lastId = 0;
    let enhanced = 0;
    let failed = 0;
    for (;;) {
      const rows = (await this.dataSource.query(
        `SELECT DISTINCT ca."spacecraftId" AS "id", u."vacationMode", u."vacationStartedAt"
           FROM "crew_assignments" ca
           JOIN "spacecraft" s ON s."id" = ca."spacecraftId"
           JOIN "users" u ON u."id" = s."userId"
          WHERE NOT u."isNpc" AND ca."spacecraftId" > $1
          ORDER BY ca."spacecraftId"
          LIMIT $2`,
        [lastId, BATCH_SIZE],
      )) as Array<{ id: number; vacationMode: boolean; vacationStartedAt: Date | null }>;
      if (rows.length === 0) break;
      lastId = rows[rows.length - 1].id;
      for (const row of rows) {
        if (isVacationEffective(row, now)) continue;
        try {
          await this.crewEnhancement.enhanceSpacecraft(row.id, CrewEnhancementEvent.MAINTENANCE_TICK);
          enhanced += 1;
        } catch (error) {
          failed += 1;
          this.logger.error(`Crew-XP für Spacecraft ${row.id} fehlgeschlagen: ${String(error)}`);
        }
      }
    }
    return `${enhanced} Spacecraft Crew-XP${failed ? `, ${failed} fehlgeschlagen` : ''}`;
  }
}
