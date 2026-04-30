import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spacecraft, SpacecraftStatus } from '../spacecraft/entities/spacecraft.entity';
import { CombatEngine, CombatResult } from './combat.engine';
import { GameGateway } from '../websocket/game.gateway';
import { WsEventType } from '@swuniverse/shared';

@Injectable()
export class CombatService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    private readonly engine: CombatEngine,
    private readonly gateway: GameGateway,
  ) {}

  async attack(
    attackerId: number,
    targetId: number,
    userId: number,
  ): Promise<CombatResult> {
    const attacker = await this.shipRepo.findOne({
      where: { id: attackerId, userId },
    });
    if (!attacker) throw new NotFoundException('Attacker not found');

    const defender = await this.shipRepo.findOne({
      where: { id: targetId },
    });
    if (!defender) throw new NotFoundException('Target not found');

    if (attacker.userId === defender.userId) {
      throw new BadRequestException('Cannot attack own ship');
    }
    if (attacker.status !== SpacecraftStatus.DOCKED) {
      throw new BadRequestException('Ship must be docked to initiate combat');
    }
    if (defender.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Target already destroyed');
    }
    if (attacker.starSystemId !== defender.starSystemId) {
      throw new BadRequestException('Target must be in same system');
    }

    // Notify combat start
    this.gateway.emitToUser(attacker.userId, WsEventType.COMBAT_STARTED, {
      attackerId: attacker.id,
      defenderId: defender.id,
    });
    this.gateway.emitToUser(defender.userId, WsEventType.COMBAT_STARTED, {
      attackerId: attacker.id,
      defenderId: defender.id,
    });

    const result = this.engine.resolveCombat(attacker, defender);

    await this.shipRepo.save(attacker);
    await this.shipRepo.save(defender);

    return result;
  }
}
