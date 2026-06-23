import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { CombatEngine, CombatResult } from './combat.engine';
import { GameGateway } from '../websocket/game.gateway';
import { WsEventType } from '@swuniverse/shared';
import { SpacecraftCrewService } from '../spacecraft/spacecraft-crew.service';

@Injectable()
export class CombatService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(SpacecraftModule)
    private readonly moduleRepo: Repository<SpacecraftModule>,
    private readonly engine: CombatEngine,
    private readonly gateway: GameGateway,
    private readonly spacecraftCrewService: SpacecraftCrewService,
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
      throw new BadRequestException('Ship must be idle to initiate combat');
    }
    if (defender.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Target already destroyed');
    }
    if (defender.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Target is in flight');
    }
    if (!(await this.spacecraftCrewService.hasEnoughCrew(attacker))) {
      throw new BadRequestException('Not enough crew');
    }

    if (attacker.inSystem && defender.inSystem) {
      if (
        attacker.starSystemId !== defender.starSystemId ||
        attacker.currentSystemFieldX !== defender.currentSystemFieldX ||
        attacker.currentSystemFieldY !== defender.currentSystemFieldY
      ) {
        throw new BadRequestException('Target must be on same field');
      }
    } else if (!attacker.inSystem && !defender.inSystem) {
      if (
        attacker.currentLayerId !== defender.currentLayerId ||
        attacker.posX !== defender.posX ||
        attacker.posY !== defender.posY
      ) {
        throw new BadRequestException('Target must be on same field');
      }
    } else {
      throw new BadRequestException('Target must be on same field');
    }

    const attackerModules = await this.moduleRepo.find({
      where: { spacecraftId: attacker.id },
    });
    const defenderModules = await this.moduleRepo.find({
      where: { spacecraftId: defender.id },
    });

    this.gateway.emitToUser(attacker.userId, WsEventType.COMBAT_STARTED, {
      attackerId: attacker.id,
      defenderId: defender.id,
    });
    this.gateway.emitToUser(defender.userId, WsEventType.COMBAT_STARTED, {
      attackerId: attacker.id,
      defenderId: defender.id,
    });

    const result = this.engine.resolveCombat(
      attacker,
      defender,
      attackerModules,
      defenderModules,
    );

    await this.shipRepo.save(attacker);
    await this.shipRepo.save(defender);
    await this.moduleRepo.save([...attackerModules, ...defenderModules]);

    return result;
  }
}
