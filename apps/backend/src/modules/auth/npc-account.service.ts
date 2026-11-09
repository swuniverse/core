import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Faction } from '@swuniverse/shared';
import { Repository } from 'typeorm';
import { FactionService } from '../faction/faction.service';
import { User } from './user.entity';

export enum NpcKey {
  HUTT_CARTEL = 'HUTT_CARTEL',
  EMPIRE_SUPPLY = 'EMPIRE_SUPPLY',
  REBEL_SUPPLY = 'REBEL_SUPPLY',
}

const NPC_DEFINITIONS = [
  {
    key: NpcKey.HUTT_CARTEL,
    username: 'Hutten-Kartell',
    faction: null,
    description: 'Neutrale Händler für Deals, Auktionen, Lotterie und den Hutten-Handelsposten.',
  },
  {
    key: NpcKey.EMPIRE_SUPPLY,
    username: 'Imperiales Versorgungsamt',
    faction: Faction.GALACTIC_EMPIRE,
    description: 'Betreiber des imperialen Basishandelsnetzes.',
  },
  {
    key: NpcKey.REBEL_SUPPLY,
    username: 'Rebellen-Nachschub',
    faction: Faction.REBEL_ALLIANCE,
    description: 'Betreiber des Basishandelsnetzes der Rebellenallianz.',
  },
] as const;

@Injectable()
export class NpcAccountService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly factionService: FactionService,
  ) {}

  onModuleInit(): Promise<void> {
    return this.seed();
  }

  async seed(): Promise<void> {
    for (const definition of NPC_DEFINITIONS) {
      const faction = definition.faction
        ? await this.factionService.findByKey(definition.faction)
        : null;
      const existing = await this.userRepo.findOneBy({ npcKey: definition.key });
      await this.userRepo.save(
        this.userRepo.create({
          ...existing,
          username: definition.username,
          displayName:
            definition.key === NpcKey.REBEL_SUPPLY
              ? 'Nachschubkommando der Rebellenallianz'
              : definition.username,
          email: `npc-${definition.key.toLowerCase()}@invalid.local`,
          passwordHash: '',
          faction: definition.faction,
          factionId: faction?.id ?? null,
          description: definition.description,
          isNpc: true,
          npcKey: definition.key,
          onboardingCompleted: true,
          emailVerifiedAt: existing?.emailVerifiedAt ?? new Date(),
          permissions: [],
        }),
      );
    }
  }

  async get(key: NpcKey): Promise<User> {
    const user = await this.userRepo.findOneBy({ npcKey: key });
    if (!user) throw new NotFoundException(`NPC account ${key} not found`);
    return user;
  }
}
