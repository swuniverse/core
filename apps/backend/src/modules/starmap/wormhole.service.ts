import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wormhole } from './entities/wormhole.entity';

export interface WormholeDto {
  id: number;
  entryLayerId: number;
  entryCx: number;
  entryCy: number;
  exitLayerId: number;
  exitCx: number;
  exitCy: number;
  isBidirectional: boolean;
  isRandomExit: boolean;
  name: string | null;
  isActive: boolean;
}

export interface CreateWormholeInput {
  entryLayerId: number;
  entryCx: number;
  entryCy: number;
  exitLayerId: number;
  exitCx: number;
  exitCy: number;
  isBidirectional?: boolean;
  isRandomExit?: boolean;
  name?: string;
}

@Injectable()
export class WormholeService {
  constructor(
    @InjectRepository(Wormhole)
    private readonly wormholeRepo: Repository<Wormhole>,
  ) {}

  async listForLayer(layerId: number): Promise<WormholeDto[]> {
    const wormholes = await this.wormholeRepo.find({
      where: [{ entryLayerId: layerId }, { exitLayerId: layerId }],
      order: { id: 'ASC' },
    });
    return wormholes.map(w => this.toDto(w));
  }

  async create(input: CreateWormholeInput): Promise<WormholeDto> {
    const wormhole = await this.wormholeRepo.save(
      this.wormholeRepo.create({
        entryLayerId: input.entryLayerId,
        entryCx: input.entryCx,
        entryCy: input.entryCy,
        exitLayerId: input.exitLayerId,
        exitCx: input.exitCx,
        exitCy: input.exitCy,
        isBidirectional: input.isBidirectional ?? false,
        isRandomExit: input.isRandomExit ?? false,
        name: input.name ?? null,
        isActive: true,
      }),
    );
    return this.toDto(wormhole);
  }

  async delete(id: number): Promise<void> {
    const wormhole = await this.wormholeRepo.findOneBy({ id });
    if (!wormhole) throw new NotFoundException('Wormhole not found');
    await this.wormholeRepo.delete({ id });
  }

  async toggle(id: number, isActive: boolean): Promise<WormholeDto> {
    const wormhole = await this.wormholeRepo.findOneBy({ id });
    if (!wormhole) throw new NotFoundException('Wormhole not found');
    wormhole.isActive = isActive;
    const updated = await this.wormholeRepo.save(wormhole);
    return this.toDto(updated);
  }

  async findExitsAt(layerId: number, cx: number, cy: number): Promise<WormholeDto[]> {
    const wormholes = await this.wormholeRepo.find({
      where: [
        { entryLayerId: layerId, entryCx: cx, entryCy: cy, isActive: true },
        { exitLayerId: layerId, exitCx: cx, exitCy: cy, isBidirectional: true, isActive: true },
      ],
    });
    return wormholes.map(w => this.toDto(w));
  }

  private toDto(w: Wormhole): WormholeDto {
    return {
      id: w.id,
      entryLayerId: w.entryLayerId,
      entryCx: w.entryCx,
      entryCy: w.entryCy,
      exitLayerId: w.exitLayerId,
      exitCx: w.exitCx,
      exitCy: w.exitCy,
      isBidirectional: w.isBidirectional,
      isRandomExit: w.isRandomExit,
      name: w.name,
      isActive: w.isActive,
    };
  }
}
