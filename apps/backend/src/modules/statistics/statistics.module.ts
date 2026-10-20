import { Module } from '@nestjs/common';
import { STATISTIC_METRICS } from './statistic-metrics';
import {
  STATISTIC_METRICS_TOKEN,
  StatisticsService,
} from './statistics.service';

@Module({
  providers: [
    { provide: STATISTIC_METRICS_TOKEN, useValue: STATISTIC_METRICS },
    StatisticsService,
  ],
  exports: [StatisticsService],
})
export class StatisticsModule {}
