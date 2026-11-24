import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MessagingService } from '../messaging/messaging.service';
import type { MaintenanceHandler } from '../tick/maintenance.service';
import { RpgPlotMember } from './rpg-plot-member.entity';
import { RpgPlot } from './rpg-plot.entity';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * STU `EmptyPlotDeletion`: plots started more than 7 days ago without any
 * HoloNet post are deleted; every member gets a system message.
 */
@Injectable()
export class EmptyPlotMaintenanceService implements MaintenanceHandler {
  readonly name = 'empty-rpg-plots';
  private readonly logger = new Logger(EmptyPlotMaintenanceService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly messages: MessagingService,
  ) {}

  async run(now: Date): Promise<string> {
    const plots = (await this.dataSource.query(
      `SELECT p."id" FROM "rpg_plots" p
        WHERE p."startedAt" < $1
          AND NOT EXISTS (
            SELECT 1 FROM "holonet_posts" h WHERE h."plotId" = p."id" AND h."deletedAt" IS NULL)
        ORDER BY p."id"`,
      [new Date(now.getTime() - MAX_AGE_MS)],
    )) as Array<{ id: number }>;
    let deleted = 0;
    for (const { id } of plots) {
      try {
        const afterCommit: Array<() => void> = [];
        await this.dataSource.transaction(async (manager) => {
          const plot = await manager.findOne(RpgPlot, { where: { id }, lock: { mode: 'pessimistic_write' } });
          if (!plot) return;
          const members = await manager.find(RpgPlotMember, { where: { plotId: id }, order: { id: 'ASC' } });
          await manager.delete(RpgPlot, id);
          for (const member of members) {
            await this.messages.sendSystem(
              member.userId,
              'Plot gelöscht',
              `Der Plot "${plot.title}" wurde gelöscht, da er veraltet ist und keine Beiträge enthält.`,
              undefined,
              undefined,
              undefined,
              false,
              { manager, afterCommit },
            );
          }
          deleted += 1;
        });
        afterCommit.forEach((notify) => notify());
      } catch (error) {
        this.logger.error(`Löschen von Plot ${id} fehlgeschlagen: ${String(error)}`);
      }
    }
    return `${deleted} leere Plots gelöscht`;
  }
}
