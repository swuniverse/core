/** Zeiteinheiten, in denen Statistiken abgefragt werden können. */
export const STATISTIC_UNITS = ['tick', 'daily', 'weekly', 'monthly'] as const;
export type StatisticUnit = (typeof STATISTIC_UNITS)[number];

export type StatisticSeriesDto = { key: string; label: string };
export type StatisticPointDto = { t: string; values: Record<string, number> };
export type StatisticDto = {
  key: string;
  title: string;
  series: StatisticSeriesDto[];
  points: StatisticPointDto[];
};
export type StatisticsResponseDto = {
  unit: StatisticUnit;
  metrics: StatisticDto[];
};
