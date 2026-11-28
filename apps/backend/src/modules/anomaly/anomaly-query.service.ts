import { Injectable } from '@nestjs/common';
import { DataSource, In, MoreThan } from 'typeorm';
import type { AnomalyViewDto } from '@swuniverse/shared';
import { AnomalyRegistry } from './anomaly-registry';
import { Anomaly } from './entities/anomaly.entity';

export type HunterSignal = 'YELLOW' | 'ORANGE' | 'RED';

type FieldScope = 'galaxyFieldId' | 'systemFieldId';

/** Read model for active anomalies in scans and field views. */
@Injectable()
export class AnomalyQueryService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly registry: AnomalyRegistry,
  ) {}

  async findAtLocation(locationId: number | null): Promise<AnomalyViewDto[]> {
    if (locationId == null) return [];
    const anomalies = await this.dataSource.getRepository(Anomaly).find({
      where: { locationId, remainingTicks: MoreThan(0) },
      relations: ['type', 'parent'],
      order: { id: 'ASC' },
    });
    return anomalies.map((anomaly) => this.toView(anomaly));
  }

  /**
   * Anomaly warning (always on, ion storms and seasonal anomalies alike): colour of the nearest
   * active anomaly by field distance (largest coordinate difference) in LSS ranges. Inside the range red, up to 2 ranges orange,
   * up to 3 yellow, farther none. No direction is revealed.
   */
  async hunterSignal(
    layerId: number,
    x: number,
    y: number,
    range: number,
  ): Promise<HunterSignal | null> {
    if (range <= 0) return null;
    const row = await this.dataSource
      .getRepository(Anomaly)
      .createQueryBuilder('a')
      .innerJoin('a.location', 'l')
      .innerJoin('l.galaxyField', 'f')
      .select('MIN(GREATEST(ABS(f.cx - :x), ABS(f.cy - :y)))', 'distance')
      .where('a.remainingTicks > 0 AND f.layerId = :layerId')
      .setParameters({ x, y, layerId })
      .getRawOne<{ distance: string | null }>();
    if (row?.distance == null) return null;
    const distance = Number(row.distance);
    if (distance <= range) return 'RED';
    if (distance <= range * 2) return 'ORANGE';
    if (distance <= range * 3) return 'YELLOW';
    return null;
  }

  findAtGalaxyFields(fieldIds: number[]): Promise<Map<number, AnomalyViewDto[]>> {
    return this.findAtFields('galaxyFieldId', fieldIds);
  }

  findAtSystemFields(fieldIds: number[]): Promise<Map<number, AnomalyViewDto[]>> {
    return this.findAtFields('systemFieldId', fieldIds);
  }

  private async findAtFields(scope: FieldScope, fieldIds: number[]): Promise<Map<number, AnomalyViewDto[]>> {
    const byField = new Map<number, AnomalyViewDto[]>();
    if (!fieldIds.length) return byField;
    const anomalies = await this.dataSource.getRepository(Anomaly).find({
      where: { location: { [scope]: In(fieldIds) }, remainingTicks: MoreThan(0) },
      relations: ['type', 'location', 'parent'],
      order: { id: 'ASC' },
    });
    for (const anomaly of anomalies) {
      const fieldId = anomaly.location?.[scope];
      if (fieldId == null) continue;
      const views = byField.get(fieldId) ?? [];
      views.push(this.toView(anomaly));
      byField.set(fieldId, views);
    }
    return byField;
  }

  private toView(anomaly: Anomaly): AnomalyViewDto {
    const handler = this.registry.find(anomaly.type.key);
    return {
      type: anomaly.type.key,
      name: handler?.name ?? anomaly.type.key,
      remainingTicks: anomaly.remainingTicks,
      ...handler?.present?.(anomaly),
    };
  }
}
