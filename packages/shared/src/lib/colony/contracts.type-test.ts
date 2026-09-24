import type {
  ColonyEnvironmentScanDto,
  CommodityLocationsDto,
} from '@swuniverse/shared';

const environmentScanContract: ColonyEnvironmentScanDto = {
  bounds: { minX: 1, maxX: 5, minY: 1, maxY: 5 },
  fields: [],
  signatures: [{ x: 2, y: 3, visibleCount: 1 }],
  fadedSignatures: { uncloaked: 0, cloaked: 0 },
  colonyShields: [],
  anomalies: [],
};

const commodityLocationsContract: CommodityLocationsDto = {
  commodityId: 2,
  commodityName: 'Duranium',
  colonies: [],
  spacecraft: [],
};

void environmentScanContract;
void commodityLocationsContract;
