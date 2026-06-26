import { Injectable } from '@nestjs/common';
import { Colony } from './entities/colony.entity';
import { ColonyInternalSummary } from './colony-stats.service';
import { GameDataService } from '../game-data/game-data.service';

export interface SocialEffectValue {
  commodityId: number;
  name: string;
  value: number;
}

export interface LifeStandardValue extends SocialEffectValue {
  absolute: number;
  percent: number;
}

export interface GeneratedCrewInput {
  primaryEffect: number;
  secondaryEffect: number;
  negativeEffect: number;
  workers: number;
  lifeStandardPercent: number;
}

@Injectable()
export class ColonySocialService {
  constructor(private readonly gameData: GameDataService) {}

  getLifeStandard(
    colony: Colony,
    summary: ColonyInternalSummary,
  ): LifeStandardValue {
    const commodityId =
      this.gameData.getSocialEffects()?.lifeStandardCommodityId ?? 1300;
    const absolute = summary.productionDelta.get(commodityId) ?? 0;
    const percent = this.getLifeStandardPercent(
      colony.population ?? 0,
      absolute,
    );
    const commodity = this.gameData.getCommodity(commodityId);
    return {
      commodityId,
      name: commodity?.name ?? 'Lebensstandard',
      value: absolute,
      absolute,
      percent,
    };
  }

  getPositivePrimaryEffect(
    summary: ColonyInternalSummary,
    factionKey?: string,
  ): SocialEffectValue {
    const commodityId =
      this.getSocialCommodityIds(factionKey).primaryEffectCommodityId;
    const commodity = this.gameData.getCommodity(commodityId);
    return {
      commodityId,
      name: commodity?.name ?? `Effekt #${commodityId}`,
      value: summary.productionDelta.get(commodityId) ?? 0,
    };
  }

  getPositiveSecondaryEffect(
    summary: ColonyInternalSummary,
    factionKey?: string,
  ): SocialEffectValue {
    const commodityId =
      this.getSocialCommodityIds(factionKey).secondaryEffectCommodityId;
    const commodity = this.gameData.getCommodity(commodityId);
    return {
      commodityId,
      name: commodity?.name ?? `Effekt #${commodityId}`,
      value: summary.productionDelta.get(commodityId) ?? 0,
    };
  }

  getNegativeEffect(population: number): number {
    return Math.ceil(Math.max(0, population) / 70);
  }

  getLifeStandardPercent(population: number, absolute: number): number {
    if (absolute <= 0 || population <= 0) return absolute > 0 ? 100 : 0;
    if (absolute >= population) return 100;
    return Math.floor((absolute * 100) / population);
  }

  calculateGeneratedCrew(input: GeneratedCrewInput): number {
    const effectivePositive = Math.min(
      Math.max(
        input.primaryEffect -
          4 * Math.max(0, input.negativeEffect - input.secondaryEffect),
        0,
      ),
      input.workers,
    );
    return Math.floor(
      10 + (effectivePositive / 5) * (input.lifeStandardPercent / 100),
    );
  }

  calculateLocalCrewLimit(
    colony: Colony,
    summary: ColonyInternalSummary,
    factionKey?: string,
  ): number {
    const workers = colony.stats?.workers ?? summary.workersUsed;
    const primary = this.getPositivePrimaryEffect(summary, factionKey);
    const secondary = this.getPositiveSecondaryEffect(summary, factionKey);
    const negative = this.getNegativeEffect(colony.population ?? 0);
    const lifeStandard = this.getLifeStandard(colony, summary);
    return this.calculateGeneratedCrew({
      primaryEffect: primary.value,
      secondaryEffect: secondary.value,
      negativeEffect: negative,
      workers,
      lifeStandardPercent: lifeStandard.percent,
    });
  }

  buildSocialSummary(
    colony: Colony,
    summary: ColonyInternalSummary,
    global: {
      globalCrewLimit: number;
      crewOnShips: number;
      availableCrewOnColony: number;
      inTraining: number;
      trainableRemaining: number;
    },
    factionKey?: string,
  ) {
    const primary = this.getPositivePrimaryEffect(summary, factionKey);
    const secondary = this.getPositiveSecondaryEffect(summary, factionKey);
    const negativeEffect = this.getNegativeEffect(colony.population ?? 0);
    const lifeStandard = this.getLifeStandard(colony, summary);
    const workers = colony.stats?.workers ?? summary.workersUsed;
    const generatedCrew = this.calculateGeneratedCrew({
      primaryEffect: primary.value,
      secondaryEffect: secondary.value,
      negativeEffect,
      workers,
      lifeStandardPercent: lifeStandard.percent,
    });
    return {
      local: {
        primaryEffect: primary,
        secondaryEffect: secondary,
        negativeEffect,
        lifeStandard,
        generatedCrew,
        workers,
        population: colony.population ?? 0,
      },
      global,
      calculatorDefaults: {
        primaryEffect: primary.value,
        secondaryEffect: secondary.value,
        negativeEffect,
        workers,
        lifeStandardAbsolute: lifeStandard.absolute,
        population: colony.population ?? 0,
        generatedCrew,
      },
    };
  }

  private getSocialCommodityIds(factionKey?: string) {
    const socialEffects = this.gameData.getSocialEffects();
    return (
      (factionKey && socialEffects?.factions?.[factionKey]) ||
      socialEffects?.fallback || {
        primaryEffectCommodityId: 1001,
        secondaryEffectCommodityId: 1601,
      }
    );
  }
}
