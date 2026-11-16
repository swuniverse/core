import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import type { CombatReportDto } from '@swuniverse/shared';
import { Spacecraft } from './entities/spacecraft.entity';

@Injectable()
export class LastCombatReportService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly ships: Repository<Spacecraft>,
  ) {}
  has(id: number): Promise<boolean> {
    return this.ships.existsBy({ id, lastCombatReport: Not(IsNull()) });
  }
  async get(id: number, userId: number): Promise<CombatReportDto> {
    const ship = await this.ships.findOne({
      where: { id, userId },
      select: { id: true, lastCombatReport: true },
    });
    if (!ship?.lastCombatReport)
      throw new NotFoundException('Kein Kampfbericht verfügbar');
    return ship.lastCombatReport;
  }
}
