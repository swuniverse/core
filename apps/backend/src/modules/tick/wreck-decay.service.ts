import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpacecraftWreck } from '../spacecraft/entities/spacecraft-wreck.entity';

export const WRECK_DECAY_RANDOM_TOKEN = 'WRECK_DECAY_RANDOM';
export type WreckDecayRandom = () => number;

const randomWreckDamage: WreckDecayRandom = () =>
  Math.floor(Math.random() * 11) + 5;

@Injectable()
export class WreckDecayService {
  constructor(
    @InjectRepository(SpacecraftWreck)
    private readonly wreckRepo: Repository<SpacecraftWreck>,
    @Inject(WRECK_DECAY_RANDOM_TOKEN)
    private readonly randomDamage: WreckDecayRandom = randomWreckDamage,
  ) {}

  async processTick(): Promise<void> {
    const wrecks = await this.wreckRepo.find({ order: { id: 'ASC' } });
    const depleted: SpacecraftWreck[] = [];
    const remaining: SpacecraftWreck[] = [];

    for (const wreck of wrecks) {
      wreck.hull -= this.randomDamage();
      (wreck.hull <= 0 ? depleted : remaining).push(wreck);
    }

    if (remaining.length > 0) await this.wreckRepo.save(remaining);
    if (depleted.length > 0) await this.wreckRepo.remove(depleted);
  }
}
