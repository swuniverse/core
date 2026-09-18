import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameEvent, GameEventType } from './entities/game-event.entity';
import { resolveSpacecraftField } from '../spacecraft/spacecraft-field';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';

@Injectable()
export class GameEventService {
  constructor(
    @InjectRepository(GameEvent) private readonly events: Repository<GameEvent>,
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
      }),
    );
  }

  recent(limit = 20) {
    return this.events.find({
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 50),
    });
  }
}
