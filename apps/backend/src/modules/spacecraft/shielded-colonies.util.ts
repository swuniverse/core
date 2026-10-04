import type { Repository } from 'typeorm';
import type { Colony } from '../colony/entities/colony.entity';

/**
 * Ids der Himmelskoerper eines Systems, auf denen eine aktive Kolonie mit
 * errichtetem planetarem Schild (Schildenergie > 0) liegt. Grundlage fuer die
 * Schild-Variante der Planetengrafik auf LSS-Karte und im Sektor-Scan.
 */
export async function findShieldedColonyObjectIds(
  colonyRepo: Repository<Colony>,
  systemId: number,
): Promise<Set<number>> {
  const rows = await colonyRepo
    .createQueryBuilder('colony')
    .innerJoin('colony.changeable', 'changeable')
    .select('colony.celestialObjectId', 'celestialObjectId')
    .where('colony.starSystemId = :systemId', { systemId })
    .andWhere('colony.isAbandoned = false')
    .andWhere('colony.celestialObjectId IS NOT NULL')
    .andWhere('changeable.shields > 0')
    .getRawMany<{ celestialObjectId: number }>();
  return new Set(rows.map((row) => Number(row.celestialObjectId)));
}
