import { Injectable } from '@nestjs/common';
import { DataSource, In, MoreThan } from 'typeorm';
import type { AnomalyViewDto } from '@swuniverse/shared';
import { AnomalyRegistry } from './anomaly-registry';
import { Anomaly } from './entities/anomaly.entity';

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
      relations: ['type'],
      order: { id: 'ASC' },
    });
    return anomalies.map((anomaly) => this.toView(anomaly));
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
      relations: ['type', 'location'],
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
    return {
      type: anomaly.type.key,
      name: this.registry.find(anomaly.type.key)?.name ?? anomaly.type.key,
      remainingTicks: anomaly.remainingTicks,
    };
  }
}
