import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import { FactionEntity } from './entities/faction.entity';
import { FactionModifier } from './entities/faction-modifier.entity';
import { User } from '../auth/user.entity';
import { nonNpcUsers } from '../auth/non-npc-users';

/** Factions that are never open to players; they only classify hulls and NPC content. */
export const NON_PLAYER_FACTIONS: ReadonlyArray<{ key: string; name: string; colorPrimary: string; colorSecondary: string }> = [
  { key: 'DROIDS', name: 'Droiden', colorPrimary: '#a3a3a3', colorSecondary: '#e5e5e5' },
  { key: 'NEUTRAL', name: 'Neutral', colorPrimary: '#78716c', colorSecondary: '#d6d3d1' }, // reserved for later
  { key: 'OLDTIMER', name: 'Oldtimer', colorPrimary: '#a16207', colorSecondary: '#fde68a' },
];

export function isPlayerFactionKey(key: string): boolean {
  return (Object.values(Faction) as string[]).includes(key);
}

const DEFAULT_FACTIONS: Array<{
  key: Faction;
  name: string;
  colorPrimary: string;
  colorSecondary: string;
  homeZone: string;
  starterShipClassId: number;
  starterProfileKey: string;
  startResearchTechId: number;
  startBuildingId: number;
  modifiers: Pick<FactionModifier, 'researchMultiplier'>;
}> = [
  {
    key: Faction.REBEL_ALLIANCE,
    name: 'Rebellenallianz',
    colorPrimary: '#2563eb',
    colorSecondary: '#bfdbfe',
    homeZone: 'REBEL',
    starterShipClassId: 1001,
    starterProfileKey: 'rebel-starter',
    startResearchTechId: 1001,
    startBuildingId: 82010100,
    modifiers: {
      researchMultiplier: 1,
    },
  },
  {
    key: Faction.GALACTIC_EMPIRE,
    name: 'Galaktisches Imperium',
    colorPrimary: '#dc2626',
    colorSecondary: '#fecaca',
    homeZone: 'EMPIRE',
    starterShipClassId: 2001,
    starterProfileKey: 'empire-starter',
    startResearchTechId: 1003,
    startBuildingId: 82010300,
    modifiers: {
      researchMultiplier: 1,
    },
  },
];

/** STU `FactionItem::hasFreePlayerSlots`. */
export function hasFreePlayerSlots(
  faction: Pick<FactionEntity, 'playerLimit'>,
  playerCount: number,
): boolean {
  return faction.playerLimit === 0 || playerCount < faction.playerLimit;
}

function countFactionPlayers(manager: EntityManager, factionId: number): Promise<number> {
  return nonNpcUsers(manager.getRepository(User).createQueryBuilder('u'), 'u')
    .andWhere('u.factionId = :factionId', { factionId })
    .getCount();
}

/**
 * STU `Register`: rejects unknown, unselectable and full factions. Locks the
 * faction row so parallel joins inside the caller's transaction cannot overbook.
 */
export async function lockJoinableFaction(
  manager: EntityManager,
  where: { id: number } | { key: string },
): Promise<FactionEntity> {
  const faction = await manager.getRepository(FactionEntity).findOne({
    where,
    lock: { mode: 'pessimistic_write' },
  });
  if (!faction) throw new BadRequestException('Unbekannte Fraktion.');
  if (!isPlayerFactionKey(faction.key) || !faction.isSelectable) {
    throw new BadRequestException('Diese Fraktion ist derzeit nicht wählbar.');
  }
  if (!hasFreePlayerSlots(faction, await countFactionPlayers(manager, faction.id))) {
    throw new BadRequestException(
      'Bei dieser Fraktion sind alle vorgesehenen Spielerplätze belegt.',
    );
  }
  return faction;
}

@Injectable()
export class FactionService {
  constructor(
    @InjectRepository(FactionEntity)
    private readonly factionRepo: Repository<FactionEntity>,
    @InjectRepository(FactionModifier)
    private readonly factionModifierRepo: Repository<FactionModifier>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async seedDefaults(): Promise<void> {
    // Seed by key so databases that predate a faction (or a migration-created one) get it too.
    for (const definition of NON_PLAYER_FACTIONS) {
      if (await this.factionRepo.existsBy({ key: definition.key })) continue;
      const faction = await this.factionRepo.save(
        this.factionRepo.create({ ...definition, isSelectable: false }),
      );
      await this.factionModifierRepo.save(
        this.factionModifierRepo.create({ factionId: faction.id, researchMultiplier: 1 }),
      );
    }
    for (const definition of DEFAULT_FACTIONS) {
      if (await this.factionRepo.existsBy({ key: definition.key })) continue;
      const faction = await this.factionRepo.save(
        this.factionRepo.create({
          key: definition.key,
          name: definition.name,
          colorPrimary: definition.colorPrimary,
          colorSecondary: definition.colorSecondary,
          homeZone: definition.homeZone,
          starterShipClassId: definition.starterShipClassId,
          starterProfileKey: definition.starterProfileKey,
          startResearchTechId: definition.startResearchTechId,
          startBuildingId: definition.startBuildingId,
        }),
      );

      await this.factionModifierRepo.save(
        this.factionModifierRepo.create({
          factionId: faction.id,
          ...definition.modifiers,
        }),
      );
    }
  }

  async syncStarterShipClassIds(): Promise<void> {
    // ponytail: legacy stub, remove when starterShipClassId column dropped
  }

  async syncModifiers(): Promise<void> {
    for (const definition of DEFAULT_FACTIONS) {
      const faction = await this.factionRepo.findOne({ where: { key: definition.key } });
      if (!faction) continue;
      await this.factionModifierRepo.update({ factionId: faction.id }, definition.modifiers);
    }
  }

  async findAll(): Promise<
    (FactionEntity & { playerCount: number; hasFreePlayerSlots: boolean })[]
  > {
    const factions = await this.factionRepo.find({ relations: { modifiers: true } });
    // Same count as lockJoinableFaction: every non-NPC account of the faction (STU).
    const counts: { factionId: number; count: string }[] = await nonNpcUsers(
      this.userRepo.createQueryBuilder('u'),
      'u',
    )
      .select('u.factionId', 'factionId')
      .addSelect('COUNT(*)', 'count')
      .andWhere('u.factionId IS NOT NULL')
      .groupBy('u.factionId')
      .getRawMany();
    const countMap = Object.fromEntries(counts.map((r) => [r.factionId, +r.count]));
    return factions.map((f) => {
      const playerCount = countMap[f.id] ?? 0;
      return Object.assign(f, {
        playerCount,
        hasFreePlayerSlots: hasFreePlayerSlots(f, playerCount),
      });
    });
  }

  findById(id: number): Promise<FactionEntity | null> {
    return this.factionRepo.findOneBy({ id });
  }

  async updateSelectability(
    id: number,
    isSelectable: boolean,
  ): Promise<FactionEntity> {
    return this.updateAdminFields(id, { isSelectable });
  }

  async updatePlayerLimit(id: number, playerLimit: number): Promise<FactionEntity> {
    return this.updateAdminFields(id, { playerLimit });
  }

  private async updateAdminFields(
    id: number,
    fields: Partial<Pick<FactionEntity, 'isSelectable' | 'playerLimit'>>,
  ): Promise<FactionEntity> {
    const faction = await this.findById(id);
    if (!faction) {
      throw new NotFoundException('Faction not found');
    }
    return this.factionRepo.save(Object.assign(faction, fields));
  }

  findByKey(key: Faction | string): Promise<FactionEntity | null> {
    return this.factionRepo.findOne({
      where: { key },
      relations: { modifiers: true },
    });
  }
}
