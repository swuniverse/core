import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';

@Injectable()
export class SpacecraftService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
  ) {}

  async findAllByUser(userId: number): Promise<Spacecraft[]> {
    return this.shipRepo.find({
      where: { userId },
      relations: ['starSystem'],
      order: { id: 'ASC' },
    });
  }

  async findOne(shipId: number, userId: number): Promise<Spacecraft> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['starSystem'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    return ship;
  }

  async rename(shipId: number, userId: number, name: string): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    ship.name = name;
    return this.shipRepo.save(ship);
  }

  async navigate(
    shipId: number,
    userId: number,
    targetX: number,
    targetY: number,
  ): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);

    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot navigate during combat');
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }

    const dx = Math.abs(targetX - ship.posX);
    const dy = Math.abs(targetY - ship.posY);
    const distance = Math.max(dx, dy);

    if (distance === 0) {
      throw new BadRequestException('Already at target position');
    }

    const travelTimeMs = Math.ceil((distance / ship.warpSpeed) * 60_000);

    ship.status = SpacecraftStatus.IN_FLIGHT;
    ship.targetX = targetX;
    ship.targetY = targetY;
    ship.arrivalAt = new Date(Date.now() + travelTimeMs);

    return this.shipRepo.save(ship);
  }

  async warp(
    shipId: number,
    userId: number,
    targetSystemId: number,
  ): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);

    if (ship.status !== SpacecraftStatus.DOCKED && ship.status !== SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Cannot warp in current state');
    }
    if (ship.warpCooldown > 0) {
      throw new BadRequestException('Warp drive cooling down');
    }

    const warpTimeMs = 5 * 60_000; // 5 minutes base warp time

    ship.status = SpacecraftStatus.IN_FLIGHT;
    ship.targetSystemId = targetSystemId;
    ship.arrivalAt = new Date(Date.now() + warpTimeMs);
    ship.warpCooldown = 3; // 3 ticks cooldown

    return this.shipRepo.save(ship);
  }

  async processMovement(ship: Spacecraft): Promise<void> {
    if (ship.status !== SpacecraftStatus.IN_FLIGHT || !ship.arrivalAt) return;

    if (new Date() >= ship.arrivalAt) {
      if (ship.targetSystemId) {
        ship.starSystemId = ship.targetSystemId;
        ship.posX = 10;
        ship.posY = 10;
        ship.targetSystemId = null;
      } else if (ship.targetX !== null && ship.targetY !== null) {
        ship.posX = ship.targetX;
        ship.posY = ship.targetY;
      }

      ship.targetX = null;
      ship.targetY = null;
      ship.arrivalAt = null;
      ship.status = SpacecraftStatus.DOCKED;

      await this.shipRepo.save(ship);
    }
  }

  async processTick(ship: Spacecraft): Promise<void> {
    await this.processMovement(ship);

    // Energy regeneration
    if (ship.energy < ship.energyMax) {
      ship.energy = Math.min(ship.energy + 5, ship.energyMax);
    }

    // Shield regeneration
    if (ship.shields < ship.shieldsMax && ship.energy > 10) {
      const regen = Math.min(3, ship.shieldsMax - ship.shields);
      ship.shields += regen;
      ship.energy -= 2;
    }

    // Warp cooldown
    if (ship.warpCooldown > 0) {
      ship.warpCooldown--;
    }

    await this.shipRepo.save(ship);
  }
}
