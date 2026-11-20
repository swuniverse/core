import type {
  ProfileLogbookDto,
  SpacecraftLogbookEntryDto,
} from '@swuniverse/shared';
import type { EntityManager } from 'typeorm';
import { ShipLogEntry } from './entities/ship-log-entry.entity';
import { ShipLogScan } from './entities/ship-log-scan.entity';

/** Entries a foreigner may read: STU `is_private = false`, written and last edited by `until`. */
function visibleUntil(alias: string, until: string) {
  return `${alias}."isPrivate" = false AND ${alias}."createdAt" <= ${until} AND (${alias}."editedAt" IS NULL OR ${alias}."editedAt" <= ${until})`;
}

const toEntryDto = (entry: ShipLogEntry): SpacecraftLogbookEntryDto => ({
  id: entry.id,
  body: entry.body,
  createdAt: entry.createdAt.toISOString(),
  editedAt: entry.editedAt?.toISOString() ?? null,
});

/** STU `ShowScan`: read the target's logbook and remember the scan when it has entries. */
export async function scanLogbook(
  manager: EntityManager,
  userId: number,
  spacecraftId: number,
  scannedAt: Date,
): Promise<SpacecraftLogbookEntryDto[]> {
  const entries = await manager
    .getRepository(ShipLogEntry)
    .createQueryBuilder('log')
    .where('log.spacecraftId = :spacecraftId', { spacecraftId })
    .andWhere(visibleUntil('log', ':scannedAt'), { scannedAt })
    .orderBy('log.createdAt', 'DESC')
    .addOrderBy('log.id', 'DESC')
    .getMany();
  if (entries.length > 0) {
    await manager.getRepository(ShipLogScan).upsert(
      { userId, spacecraftId, scannedAt },
      ['userId', 'spacecraftId'],
    );
  }
  return entries.map(toEntryDto);
}

/** STU `getGroupedLogbooksForProfile`: own profile all own entries, otherwise only scanned ones. */
export async function profileLogbooks(
  manager: EntityManager,
  profileUserId: number,
  viewerId: number,
): Promise<ProfileLogbookDto[]> {
  const query = manager
    .getRepository(ShipLogEntry)
    .createQueryBuilder('log')
    .innerJoinAndSelect('log.spacecraft', 'ship')
    .leftJoinAndSelect('ship.shipClass', 'shipClass')
    .where('log.authorId = :profileUserId', { profileUserId })
    .orderBy('log.createdAt', 'DESC')
    .addOrderBy('log.id', 'DESC');
  if (profileUserId !== viewerId) {
    query
      .innerJoin(
        ShipLogScan,
        'scan',
        'scan.spacecraftId = log.spacecraftId AND scan.userId = :viewerId',
        { viewerId },
      )
      .addSelect('scan.scannedAt')
      .andWhere(visibleUntil('log', 'scan."scannedAt"'));
  }
  const { entities, raw } = await query.getRawAndEntities<{
    scan_scannedAt?: Date;
  }>();
  const groups = new Map<number, ProfileLogbookDto>();
  entities.forEach((entry, index) => {
    const scannedAt = raw[index]?.scan_scannedAt;
    let group = groups.get(entry.spacecraftId);
    if (!group) {
      group = {
        spacecraftId: entry.spacecraftId,
        name: entry.spacecraft.name,
        shipClassName: entry.spacecraft.shipClass?.name ?? null,
        scannedAt: scannedAt ? new Date(scannedAt).toISOString() : null,
        entries: [],
      };
      groups.set(entry.spacecraftId, group);
    }
    group.entries.push(toEntryDto(entry));
  });
  return [...groups.values()];
}
