import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  ColonySandboxMetricsDto,
  ColonySandboxPreviewDto,
} from '@swuniverse/shared';
import { ColonySandbox } from './entities/colony-sandbox.entity';
import { Colony } from './entities/colony.entity';
import {
  ColonyInternalSummary,
  ColonyStatsService,
} from './colony-stats.service';
import { ColonySocialService } from './colony-social.service';
import { GameDataService } from '../game-data/game-data.service';
import { colonySandboxContext } from './colony-sandbox-context';

@Injectable()
export class ColonySandboxPreviewService {
  constructor(
    private readonly source: DataSource,
    private readonly stats: ColonyStatsService,
    private readonly social: ColonySocialService,
    private readonly gameData: GameDataService,
  ) {}

  private metrics(
    colony: Colony,
    summary: ColonyInternalSummary,
  ): ColonySandboxMetricsDto {
    const population = summary.effectiveState.population;
    const energy = summary.effectiveState.energy;
    const lifeStandard = this.social.getLifeStandard(colony, summary);
    return {
      energyBalance: energy.delta,
      energyProduction: energy.production,
      energyConsumption: energy.consumption,
      energyMax: energy.max,
      population: population.current,
      housing: population.maxHousing,
      housingFree: population.freeHousing,
      workers: population.workers,
      freeWorkers: population.available,
      lifeStandard: lifeStandard.absolute,
      lifeStandardPercent: lifeStandard.percent,
    };
  }

  async preview(userId: number, id: number): Promise<ColonySandboxPreviewDto> {
    // A single database snapshot keeps the live comparison and planning inputs coherent.
    return this.source.transaction('REPEATABLE READ', async (manager) => {
      const sandbox = await manager
        .getRepository(ColonySandbox)
        .findOne({ where: { id, userId } });
      if (!sandbox) throw new NotFoundException('Sandbox nicht gefunden.');
      const context = colonySandboxContext(sandbox, this.gameData);
      const baseHousing =
        sandbox.snapshot.baseHousing ??
        sandbox.snapshot.populationMax -
          this.stats.calculateSummary(context).housingBonus;
      const planSummary = this.stats.calculatePlanningSummary(
        context,
        baseHousing,
      );
      const planMetrics = this.metrics(context, planSummary);
      const colony =
        sandbox.sourceColonyId == null
          ? null
          : await manager.getRepository(Colony).findOne({
              where: { id: sandbox.sourceColonyId, userId, isAbandoned: false },
              relations: ['fields', 'changeable', 'stats', 'celestialObject'],
            });
      const liveSummary = colony ? this.stats.calculateSummary(colony) : null;
      const liveMetrics =
        colony && liveSummary ? this.metrics(colony, liveSummary) : null;
      const difference = liveMetrics ? { ...planMetrics } : null;
      if (difference && liveMetrics)
        for (const key of Object.keys(planMetrics) as Array<
          keyof ColonySandboxMetricsDto
        >)
          difference[key] = planMetrics[key] - liveMetrics[key];
      const production = (summary: ColonyInternalSummary | null) =>
        new Map(
          summary ? [...summary.productionDelta, ...summary.depositDelta] : [],
        );
      const planProduction = production(planSummary);
      const liveProduction = production(liveSummary);
      return {
        sourceColonyName: colony?.name ?? null,
        sandbox: planMetrics,
        colony: liveMetrics,
        difference,
        production: [
          ...new Set([...planProduction.keys(), ...liveProduction.keys()]),
        ]
          .sort((a, b) => a - b)
          .map((commodityId) => {
            const commodity = this.gameData.getCommodity(commodityId);
            const amount = planProduction.get(commodityId) ?? 0;
            const live = liveSummary
              ? (liveProduction.get(commodityId) ?? 0)
              : null;
            return {
              commodityId,
              name: commodity?.name ?? `Ware #${commodityId}`,
              kind: commodity?.isDeposit
                ? 'DEPOSIT'
                : commodity?.isEffect
                  ? 'EFFECT'
                  : 'WARE',
              sandbox: amount,
              colony: live,
              difference: live == null ? null : amount - live,
            };
          }),
      };
    });
  }
}
