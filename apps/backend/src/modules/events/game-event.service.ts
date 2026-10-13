import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { ExplorationService } from '../starmap/exploration.service';
import { GameEvent, GameEventType } from './entities/game-event.entity';
import {
  resolveSpacecraftField,
  resolveSpaceLocation,
} from '../spacecraft/spacecraft-field';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';

@Injectable()
export class GameEventService {
  constructor(
    @InjectRepository(GameEvent) private readonly events: Repository<GameEvent>,
    private readonly exploration: ExplorationService,
  ) {}

  async recordSpacecraft(type: GameEventType, text: string, ship: Spacecraft) {
    const field = resolveSpacecraftField(ship);
    return this.events.save(
      this.events.create({
        type,
        text,
        scope: field?.scope ?? null,
        layerId: field?.scope === 'GALAXY' ? field.layerId : null,
        systemId: field?.scope === 'SYSTEM' ? field.systemId : null,
        x: field?.x ?? null,
        y: field?.y ?? null,
        locationId: ship.locationId ?? null,
        location: ship.location ?? null,
      }),
    );
  }

  async recent({
    viewerId,
    limit = 20,
    type,
    search,
  }: {
    viewerId: number;
    limit?: number;
    type?: string;
    search?: string;
  }) {
    const eventTypes = Object.values(GameEventType);
    const selectedType = eventTypes.includes(type as GameEventType)
      ? (type as GameEventType)
      : undefined;
    const where = {
      type: selectedType ?? In(eventTypes),
      ...(search?.trim() ? { text: ILike(`%${search.trim()}%`) } : {}),
    };
    const [events, counts] = await Promise.all([
      this.events.find({
        where,
        relations: ['location', 'location.galaxyField', 'location.systemField'],
        order: { createdAt: 'DESC' },
        take: Math.min(Math.max(limit, 1), 50),
      }),
      this.events
        .createQueryBuilder('event')
        .select('event.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('event.type IN (:...eventTypes)', { eventTypes })
        .groupBy('event.type')
        .getRawMany<{ type: GameEventType; count: string }>(),
    ]);
    const galaxyLayerIds = [
      ...new Set(
        events
          .filter((event) => event.scope === 'GALAXY')
          .map((event) => event.layerId)
          .filter((id): id is number => id != null),
      ),
    ];
    const systemIds = [
      ...new Set(
        events
          .filter((event) => event.scope === 'SYSTEM')
          .map((event) => event.systemId)
          .filter((id): id is number => id != null),
      ),
    ];
    const exploredGalaxyFields = new Set(
      (
        await Promise.all(
          galaxyLayerIds.map((layerId) =>
            this.exploration.getExploredFields(viewerId, layerId),
          ),
        )
      ).flatMap((fields) =>
        fields.map((field) => `${field.layerId}:${field.cx}:${field.cy}`),
      ),
    );
    const exploredSystems = new Set(
      (
        await Promise.all(
          systemIds.map(async (systemId) => ({
            systemId,
            isExplored: await this.exploration.isSystemExplored(
              viewerId,
              systemId,
            ),
          })),
        )
      )
        .filter(({ isExplored }) => isExplored)
        .map(({ systemId }) => systemId),
    );
    return {
      events: events.map((event) => {
        const isVisible =
          (event.scope === 'GALAXY' &&
            event.layerId != null &&
            event.x != null &&
            event.y != null &&
            exploredGalaxyFields.has(`${event.layerId}:${event.x}:${event.y}`)) ||
          (event.scope === 'SYSTEM' &&
            event.systemId != null &&
            exploredSystems.has(event.systemId));
        return {
          id: event.id,
          type: event.type,
          text: event.text,
          scope: isVisible ? event.scope : null,
          layerId: isVisible ? event.layerId : null,
          systemId: isVisible ? event.systemId : null,
          x: isVisible ? event.x : null,
          y: isVisible ? event.y : null,
          locationId: isVisible ? event.locationId : null,
          location: isVisible ? resolveSpaceLocation(event.location) : null,
          createdAt: event.createdAt.toISOString(),
        };
      }),
      counts: Object.fromEntries(
        Object.values(GameEventType).map((eventType) => [
          eventType,
          Number(counts.find((count) => count.type === eventType)?.count ?? 0),
        ]),
      ) as Record<GameEventType, number>,
    };
  }
}
