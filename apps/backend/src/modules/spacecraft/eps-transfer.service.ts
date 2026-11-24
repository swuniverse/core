import { BadRequestException, Injectable } from '@nestjs/common';
import type { SpacecraftEpsTransferResultDto } from '@swuniverse/shared';
import { DataSource } from 'typeorm';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { InteractionContextService } from './interaction-context.service';
import { checkInteraction, InteractionRule } from './interaction-policy';
import { Spacecraft } from './entities/spacecraft.entity';
import { resolveSpacecraftLocation } from './spacecraft-field';

/** The source pays this much EPS for each battery unit delivered (STU parity). */
export const EPS_TRANSFER_COST_FACTOR = 3;

const FOREIGN_RULES = [
  InteractionRule.TARGET_VACATION,
  InteractionRule.STANCE,
] as const;

const SHARED_RULES = [
  InteractionRule.POSITION,
  InteractionRule.SOURCE_UNCLOAKED,
  InteractionRule.TARGET_UNCLOAKED,
  InteractionRule.SOURCE_CREW,
  InteractionRule.SOURCE_UNSHIELDED,
  InteractionRule.SOURCE_UNHYPERSPACED,
  InteractionRule.TARGET_UNHYPERSPACED,
  InteractionRule.TARGET_UNSHIELDED,
] as const;

@Injectable()
export class EpsTransferService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly interactionContext: InteractionContextService,
    private readonly messaging: MessagingService,
  ) {}

  async transfer(
    shipId: number,
    userId: number,
    targetShipId: number,
    requested: number,
  ): Promise<SpacecraftEpsTransferResultDto> {
    if (!Number.isInteger(requested) || requested < 1) {
      throw new BadRequestException('Es wurde keine Energiemenge angegeben');
    }
    if (shipId === targetShipId) {
      throw new BadRequestException('Schiff nicht gefunden');
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const ships = await manager.getRepository(Spacecraft).find({
        where: [{ id: shipId, userId }, { id: targetShipId }],
        relations: { location: { galaxyField: true, systemField: true } },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      const source = ships.find((ship) => ship.id === shipId);
      const target = ships.find((ship) => ship.id === targetShipId);
      if (!source || !target) {
        throw new BadRequestException('Schiff nicht gefunden');
      }
      const foreign = source.userId !== target.userId;
      const decision = checkInteraction(
        await this.interactionContext.load(source.id, target.id),
        foreign ? [...FOREIGN_RULES, ...SHARED_RULES] : SHARED_RULES,
      );
      if (!decision.allowed) {
        throw new BadRequestException(
          decision.reason ?? 'Transfer nicht möglich',
        );
      }
      if (source.energy <= 0) {
        throw new BadRequestException('Keine Energie vorhanden');
      }
      if (target.battery >= target.batteryMax) {
        throw new BadRequestException(
          `Die Ersatzbatterie der ${target.name} ist bereits voll`,
        );
      }
      const transferred = Math.min(
        requested,
        Math.floor(source.energy / EPS_TRANSFER_COST_FACTOR),
        target.batteryMax - target.battery,
      );
      if (transferred < 1) {
        throw new BadRequestException('Nicht genug Energie für den Transfer');
      }
      source.energy -= transferred * EPS_TRANSFER_COST_FACTOR;
      target.battery += transferred;
      await manager.save([source, target]);
      const location = resolveSpacecraftLocation(source);
      return {
        transferred,
        foreign,
        recipientId: target.userId,
        text:
          `Die ${source.name} transferiert in Sektor ` +
          `${location ? `${location.x}|${location.y}` : '?'} ${transferred} ` +
          `Energie in die Batterie der ${target.name}`,
        targetName: target.name,
        sourceEnergy: source.energy,
      };
    });
    if (result.foreign) {
      await this.messaging.sendSystem(
        result.recipientId,
        result.text,
        undefined,
        MessageFolder.TRADE,
      );
    }
    return {
      transferred: result.transferred,
      requested,
      energy: result.sourceEnergy,
      message:
        result.transferred < requested
          ? `Es wurden ${result.transferred} von ${requested} Energie zur ${result.targetName} transferiert`
          : `Es wurde ${result.transferred} Energie zur ${result.targetName} transferiert`,
    };
  }
}
