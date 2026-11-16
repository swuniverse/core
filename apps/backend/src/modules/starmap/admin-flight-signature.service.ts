import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  AdminFlightSignatureQueryDto,
  AdminFlightSignatureFieldDto,
} from '@swuniverse/shared';
import { Layer } from './entities/layer.entity';
import { FlightSignature } from '../spacecraft/entities/flight-signature.entity';
import { FLIGHT_SIGNATURE_RETENTION_MS } from '../spacecraft/flight-signature.service';

@Injectable()
export class AdminFlightSignatureService {
  constructor(private readonly source: DataSource) {}

  async getFields(
    layerId: number,
    query: AdminFlightSignatureQueryDto,
    now = new Date(),
  ): Promise<AdminFlightSignatureFieldDto[]> {
    const layer = await this.source
      .getRepository(Layer)
      .findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Ebene nicht gefunden');
    const { xStart, xEnd, yStart, yEnd, filter = 'ALL', targetId } = query;
    if (
      ![xStart, xEnd, yStart, yEnd].every(
        (value) => Number.isSafeInteger(value) && value >= 1,
      ) ||
      xStart > xEnd ||
      yStart > yEnd ||
      xEnd > layer.width ||
      yEnd > layer.height
    ) {
      throw new BadRequestException('Ungültiger Kartenausschnitt');
    }
    if (
      !['ALL', 'SPACECRAFT', 'USER', 'ALLIANCE'].includes(filter) ||
      (filter !== 'ALL' &&
        (!Number.isSafeInteger(targetId) || Number(targetId) < 1))
    ) {
      throw new BadRequestException('Der Filter benötigt eine gültige ID');
    }
    const builder = this.source
      .getRepository(FlightSignature)
      .createQueryBuilder('signature')
      .innerJoin(
        'space_locations',
        'location',
        'location.id = signature.locationId',
      )
      .innerJoin('galaxy_fields', 'field', 'field.id = location.galaxyFieldId')
      .select('field.id', 'fieldId')
      .addSelect('field.cx', 'cx')
      .addSelect('field.cy', 'cy')
      .where('field.layerId = :layerId', { layerId })
      .andWhere(
        'field.cx BETWEEN :xStart AND :xEnd AND field.cy BETWEEN :yStart AND :yEnd',
        { xStart, xEnd, yStart, yEnd },
      )
      .andWhere(
        'signature.createdAt >= :cutoff AND signature.createdAt <= :now',
        {
          cutoff: new Date(now.getTime() - FLIGHT_SIGNATURE_RETENTION_MS),
          now,
        },
      );
    for (const direction of ['NORTH', 'EAST', 'SOUTH', 'WEST'] as const) {
      builder.addSelect(
        `COUNT(DISTINCT signature."spacecraftId") FILTER (WHERE signature."fromDirection" = '${direction}' OR signature."toDirection" = '${direction}')`,
        direction,
      );
    }
    if (filter === 'SPACECRAFT')
      builder.andWhere('signature.spacecraftId = :targetId', { targetId });
    if (filter === 'USER')
      builder.andWhere('signature.userId = :targetId', { targetId });
    if (filter === 'ALLIANCE')
      builder.andWhere(
        'EXISTS (SELECT 1 FROM alliance_memberships membership WHERE membership."userId" = signature."userId" AND membership."allianceId" = :targetId)',
        { targetId },
      );
    const rows = await builder
      .groupBy('field.id')
      .addGroupBy('field.cx')
      .addGroupBy('field.cy')
      .orderBy('field.cy', 'ASC')
      .addOrderBy('field.cx', 'ASC')
      .getRawMany<{
        fieldId: number;
        cx: number;
        cy: number;
        NORTH: string;
        EAST: string;
        SOUTH: string;
        WEST: string;
      }>();
    return rows
      .map((row) => ({
        fieldId: row.fieldId,
        cx: row.cx,
        cy: row.cy,
        directions: {
          NORTH: Number(row.NORTH),
          EAST: Number(row.EAST),
          SOUTH: Number(row.SOUTH),
          WEST: Number(row.WEST),
        },
      }))
      .filter((field) =>
        Object.values(field.directions).some((count) => count > 0),
      );
  }
}
