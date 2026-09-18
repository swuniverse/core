import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  SpacecraftCommunicationRecipientDto,
  SpacecraftDistressSignalDto,
} from '@swuniverse/shared';
import { In, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { MessagingService } from '../messaging/messaging.service';
import { GameGateway } from '../websocket/game.gateway';
import { WsEventType } from '@swuniverse/shared';
import { ShipDistressSignal } from './entities/ship-distress-signal.entity';
import { ShipLogEntry } from './entities/ship-log-entry.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import {
  resolveSpacecraftField,
  sameSpacecraftField,
} from './spacecraft-field';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

const BROADCAST_COOLDOWN_MS = 30_000;

@Injectable()
export class SpacecraftCommunicationService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ShipLogEntry)
    private readonly logRepo: Repository<ShipLogEntry>,
    @InjectRepository(ShipDistressSignal)
    private readonly distressRepo: Repository<ShipDistressSignal>,
    private readonly messaging: MessagingService,
    private readonly gateway: GameGateway,
    private readonly runtimeState: SpacecraftRuntimeStateService,
  ) {}

  private async requireShip(shipId: number, userId: number) {
    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Ship not found');
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    return ship;
  }

  async getRecipients(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftCommunicationRecipientDto[]> {
    const ship = await this.requireShip(shipId, userId);
    const candidates = new Map<
      number,
      SpacecraftCommunicationRecipientDto['source']
    >();
    const colonies =
      ship.starSystemId == null
        ? []
        : await this.colonyRepo.find({
            where: { starSystemId: ship.starSystemId },
          });
    for (const colony of colonies) {
      if (
        colony.userId != null &&
        colony.userId !== userId &&
        Math.max(
          Math.abs(colony.posX - ship.posX),
          Math.abs(colony.posY - ship.posY),
        ) <= 1
      ) {
        candidates.set(colony.userId, 'COLONY');
      }
    }
    const ships =
      ship.currentLayerId == null
        ? []
        : await this.shipRepo.find({
            where: { currentLayerId: ship.currentLayerId },
          });
    for (const other of ships) {
      if (
        other.userId !== userId &&
        other.status !== SpacecraftStatus.DESTROYED &&
        Math.max(
          Math.abs(other.posX - ship.posX),
          Math.abs(other.posY - ship.posY),
        ) <= 1
      ) {
        candidates.set(
          other.userId,
          candidates.get(other.userId) ?? 'SPACECRAFT',
        );
      }
    }
    if (candidates.size === 0) return [];
    const users = await this.userRepo.findBy({
      id: In([...candidates.keys()]),
    });
    return users.map((user) => ({
      userId: user.id,
      username: user.username,
      source: candidates.get(user.id)!,
    }));
  }

  async sendNearbyMessage(
    shipId: number,
    userId: number,
    targetShipId: number,
    body: string,
  ) {
    const [source, target] = await Promise.all([
      this.requireShip(shipId, userId),
      this.shipRepo.findOne({ where: { id: targetShipId } }),
    ]);
    if (
      !target ||
      target.status === SpacecraftStatus.DESTROYED ||
      target.userId === userId
    ) {
      throw new BadRequestException('Empfänger nicht verfügbar');
    }
    if (!sameSpacecraftField(source, target)) {
      throw new BadRequestException(
        'Empfänger befindet sich nicht auf diesem Feld',
      );
    }
    if (
      this.runtimeState.initialize(source).WARPDRIVE?.active ||
      this.runtimeState.initialize(target).WARPDRIVE?.active
    ) {
      throw new BadRequestException(
        'Nachrichten sind im Hyperraum nicht möglich',
      );
    }
    const text = body.trim();
    if (!text || text.length > 1000) {
      throw new BadRequestException(
        'Nachricht muss 1 bis 1000 Zeichen enthalten',
      );
    }
    const field = resolveSpacecraftField(source);
    const coordinates = field ? `${field.x}|${field.y}` : '?';
    await this.messaging.send(
      userId,
      target.userId,
      `Nachricht von ${source.name}`,
      `${source.name} sendet an ${target.name} in Sektor ${coordinates}:\n\n${text}`,
    );
    await this.logRepo.save(
      this.logRepo.create({
        spacecraftId: source.id,
        authorId: userId,
        body: `[DIRECT:${target.id}] ${text}`,
      }),
    );
    return { delivered: true };
  }

  async broadcast(shipId: number, userId: number, body: string) {
    const ship = await this.requireShip(shipId, userId);
    const text = body.trim();
    if (!text || text.length > 1000) {
      throw new BadRequestException(
        'Broadcast must contain 1 to 1000 characters',
      );
    }
    const recent = await this.logRepo.findOne({
      where: { spacecraftId: shipId, authorId: userId },
      order: { createdAt: 'DESC' },
    });
    if (
      recent?.body.startsWith('[BROADCAST]') &&
      Date.now() - recent.createdAt.getTime() < BROADCAST_COOLDOWN_MS
    ) {
      throw new BadRequestException('Broadcast rate limit active');
    }
    const recipients = await this.getRecipients(shipId, userId);
    await Promise.all(
      recipients.map((recipient) =>
        this.messaging.send(
          userId,
          recipient.userId,
          `Broadcast von ${ship.name}`,
          text,
        ),
      ),
    );
    await this.logRepo.save(
      this.logRepo.create({
        spacecraftId: shipId,
        authorId: userId,
        body: `[BROADCAST] ${text}`,
      }),
    );
    return { delivered: recipients.length, recipients };
  }

  async listLogs(shipId: number, userId: number, page = 1, limit = 20) {
    await this.requireShip(shipId, userId);
    const [data, total] = await this.logRepo.findAndCount({
      where: { spacecraftId: shipId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async createLog(shipId: number, userId: number, body: string) {
    await this.requireShip(shipId, userId);
    const text = body.trim();
    if (!text || text.length > 5000) {
      throw new BadRequestException(
        'Log entry must contain 1 to 5000 characters',
      );
    }
    return this.logRepo.save(
      this.logRepo.create({
        spacecraftId: shipId,
        authorId: userId,
        body: text,
      }),
    );
  }

  async updateLog(
    shipId: number,
    entryId: number,
    userId: number,
    body: string,
  ) {
    await this.requireShip(shipId, userId);
    const entry = await this.logRepo.findOne({
      where: { id: entryId, spacecraftId: shipId, authorId: userId },
    });
    if (!entry) throw new NotFoundException('Log entry not found');
    const text = body.trim();
    if (!text || text.length > 5000) {
      throw new BadRequestException(
        'Log entry must contain 1 to 5000 characters',
      );
    }
    entry.body = text;
    return this.logRepo.save(entry);
  }

  async deleteLog(shipId: number, entryId: number, userId: number) {
    await this.requireShip(shipId, userId);
    const result = await this.logRepo.delete({
      id: entryId,
      spacecraftId: shipId,
      authorId: userId,
    });
    if (!result.affected) throw new NotFoundException('Log entry not found');
  }

  async getDistress(shipId: number, userId: number) {
    await this.requireShip(shipId, userId);
    return this.distressRepo.findOne({
      where: { spacecraftId: shipId, active: true },
      order: { startedAt: 'DESC' },
    });
  }

  async startDistress(shipId: number, userId: number, message: string) {
    await this.requireShip(shipId, userId);
    const text = message.trim();
    if (!text || text.length > 250) {
      throw new BadRequestException(
        'Distress message must contain 1 to 250 characters',
      );
    }
    const active = await this.distressRepo.findOne({
      where: { spacecraftId: shipId, active: true },
    });
    if (active) {
      if (active.message === text) return active;
      throw new BadRequestException('Distress signal already active');
    }
    const signal = await this.distressRepo.save(
      this.distressRepo.create({
        spacecraftId: shipId,
        ownerId: userId,
        message: text,
        active: true,
        stoppedAt: null,
      }),
    );
    this.gateway.emitToAll(WsEventType.DISTRESS_CHANGED, {
      type: 'DISTRESS_CHANGED',
      shipId,
    });
    return signal;
  }

  async stopDistress(shipId: number, userId: number) {
    await this.requireShip(shipId, userId);
    const active = await this.distressRepo.findOne({
      where: { spacecraftId: shipId, active: true },
    });
    if (!active) return { active: false };
    active.active = false;
    active.stoppedAt = new Date();
    await this.distressRepo.save(active);
    this.gateway.emitToAll(WsEventType.DISTRESS_CHANGED, {
      type: 'DISTRESS_CHANGED',
      shipId,
    });
    return active;
  }

  async stopDistressForDestroyedShip(
    shipId: number,
    manager?: {
      findOne: Repository<ShipDistressSignal>['findOne'];
      save: Repository<ShipDistressSignal>['save'];
    },
  ): Promise<void> {
    const repository = manager ?? this.distressRepo;
    const active = await repository.findOne({
      where: { spacecraftId: shipId, active: true },
    });
    if (!active) return;
    active.active = false;
    active.stoppedAt = new Date();
    await repository.save(active);
  }

  async listActiveDistress(): Promise<SpacecraftDistressSignalDto[]> {
    const signals = await this.distressRepo.find({
      where: { active: true },
      relations: ['spacecraft'],
      order: { startedAt: 'DESC' },
      take: 100,
    });
    return signals.map((signal) => ({
      id: signal.id,
      spacecraftId: signal.spacecraftId,
      shipName: signal.spacecraft.name,
      ownerId: signal.ownerId,
      message: signal.message,
      active: signal.active,
      startedAt: signal.startedAt.toISOString(),
      stoppedAt: signal.stoppedAt?.toISOString() ?? null,
      locationLabel: signal.spacecraft.inSystem
        ? `System ${signal.spacecraft.starSystemId ?? '?'} [${signal.spacecraft.currentSystemFieldX ?? '?'},${signal.spacecraft.currentSystemFieldY ?? '?'}]`
        : `[${signal.spacecraft.posX},${signal.spacecraft.posY}]`,
    }));
  }

  async getColonyMessage(shipId: number, userId: number, colonyId: number) {
    const ship = await this.requireShip(shipId, userId);
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['celestialObject', 'changeable'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    const field = resolveSpacecraftField(ship);
    if (
      field?.scope !== 'SYSTEM' ||
      field.systemId !== colony.starSystemId ||
      field.x !== colony.posX ||
      field.y !== colony.posY
    ) {
      throw new BadRequestException('Colony is not on the current field');
    }
    return {
      colonyId,
      colonyName: colony.name,
      planetName: colony.celestialObject?.name ?? colony.name,
      message: colony.changeable?.colonyMessage ?? null,
    };
  }
}
