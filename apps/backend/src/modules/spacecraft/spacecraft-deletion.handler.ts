import { Injectable, type OnModuleInit } from '@nestjs/common';
import { In, type EntityManager } from 'typeorm';
import type { PlayerDeletionHandler } from '../account-deletion/player-deletion-handler';
import { PlayerDeletionService } from '../account-deletion/player-deletion.service';
import { ColonyShipBuildplan } from '../colony/entities/colony-ship-buildplan.entity';
import { ResearchRewardGrant } from '../research/entities/research-reward-grant.entity';
import { CelestialClassDiscovery } from '../starmap/entities/celestial-class-discovery.entity';
import { SystemTypeDiscovery } from '../starmap/entities/system-type-discovery.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDiscovery } from './entities/ship-class-discovery.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { StationClassDiscovery } from './entities/station-class-discovery.entity';

/**
 * Ships, fleets, buildplans, research and map knowledge of a deleted player
 * (sh-AP-05c, STU `SpacecraftDeletionHandler`, `FleetDeletionHandler`,
 * `SpacecraftBuildplanDeletionHandler`, `CrewDeletionHandler`,
 * `UserMapDeletionHandler`). Ships vanish without wrecks; cargo, modules,
 * torpedoes, distress signals, takeovers, repairs and logs follow them by
 * cascade. Runs after trade (100), which abandons the player's trade posts
 * before their stations go, and before the colony handler (sh-AP-05d).
 */
@Injectable()
export class SpacecraftDeletionHandler implements PlayerDeletionHandler, OnModuleInit {
  readonly order = 200;

  constructor(private readonly deletions: PlayerDeletionService) {}

  onModuleInit(): void {
    this.deletions.register(this);
  }

  async delete(tx: EntityManager, userId: number): Promise<void> {
    const ships = await tx.find(Spacecraft, { select: { id: true }, where: { userId } });
    const shipIds = ships.map((ship) => ship.id);

    await this.releaseForeignTractorBeams(tx, userId, shipIds);
    await this.deleteCrew(tx, userId, shipIds);

    const blockaded: Array<{ colonyId: number }> = await tx.query(
      `SELECT DISTINCT "colonyId" FROM "colony_orbit_assignments"
        WHERE "fleetId" IN (SELECT "id" FROM "fleets" WHERE "userId" = $1)`,
      [userId],
    );
    if (shipIds.length) await tx.delete(Spacecraft, { id: In(shipIds) });
    await tx.delete(Fleet, { userId });
    await this.syncBlockades(tx, blockaded.map((row) => row.colonyId));

    await this.deleteBuildplans(tx, userId);
    for (const entity of [
      ShipClassDiscovery,
      StationClassDiscovery,
      CelestialClassDiscovery,
      SystemTypeDiscovery,
      ResearchRewardGrant,
    ]) {
      await tx.delete(entity, { userId });
    }
    // Research, cartography plans, exploration, colony scans, scan results,
    // buoys and flight signatures follow the user row by cascade.
  }

  /** Foreign ships towing one of the player's ships lose the target and switch the beam off. */
  private async releaseForeignTractorBeams(tx: EntityManager, userId: number, shipIds: number[]): Promise<void> {
    if (!shipIds.length) return;
    const pullers = await tx.find(Spacecraft, { where: { tractoredShipId: In(shipIds) } });
    for (const puller of pullers.filter((ship) => ship.userId !== userId)) {
      const systems = { ...(puller.runtimeSystems as Record<string, { active?: boolean }> | null) };
      if (systems.TRACTOR_BEAM) systems.TRACTOR_BEAM = { ...systems.TRACTOR_BEAM, active: false };
      await tx.update(Spacecraft, puller.id, { tractoredShipId: null, runtimeSystems: systems });
    }
  }

  /**
   * Crew aboard the ships and the player's crew in escape pods or without
   * post; colony crew belongs to the colony handler. Pods emptied this way go.
   */
  private async deleteCrew(tx: EntityManager, userId: number, shipIds: number[]): Promise<void> {
    const pods: Array<{ escapePodId: number }> = await tx.query(
      `SELECT DISTINCT "escapePodId" FROM "crew_assignments" WHERE "userId" = $1 AND "escapePodId" IS NOT NULL`,
      [userId],
    );
    await tx.query(
      `DELETE FROM "crew" c
        WHERE c."id" IN (SELECT "crewId" FROM "crew_assignments" WHERE "spacecraftId" = ANY($2::int[]))
           OR (c."userId" = $1 AND NOT EXISTS (
                SELECT 1 FROM "crew_assignments" a WHERE a."crewId" = c."id" AND a."colonyId" IS NOT NULL))`,
      [userId, shipIds],
    );
    if (pods.length) {
      await tx.query(
        `DELETE FROM "escape_pods" p
          WHERE p."id" = ANY($1::int[])
            AND NOT EXISTS (SELECT 1 FROM "crew_assignments" a WHERE a."escapePodId" = p."id")`,
        [pods.map((row) => row.escapePodId)],
      );
    }
  }

  private async syncBlockades(tx: EntityManager, colonyIds: number[]): Promise<void> {
    if (!colonyIds.length) return;
    await tx.query(
      `UPDATE "colony_changeable" ch
          SET "isBlockaded" = EXISTS (
            SELECT 1 FROM "colony_orbit_assignments" o WHERE o."colonyId" = ch."colonyId" AND o."mode" = 'BLOCKADE')
        WHERE ch."colonyId" = ANY($1::int[])`,
      [colonyIds],
    );
  }

  /**
   * Plans still referenced by other players' ships, queues, deals or lottery
   * prizes stay without owner (STU `USER_FOREIGN_BUILDPLANS`); the rest goes.
   * The player's own station queues at foreign shipyards go with them.
   */
  private async deleteBuildplans(tx: EntityManager, userId: number): Promise<void> {
    await tx.query(
      `DELETE FROM "colony_ship_build_queue" WHERE "userId" = $1 AND "source" = 'STATION'`,
      [userId],
    );
    const plans = await tx.find(ColonyShipBuildplan, { select: { id: true }, where: { userId } });
    if (!plans.length) return;
    const planIds = plans.map((plan) => plan.id);
    const used: Array<{ id: number }> = await tx.query(
      `SELECT "buildPlanId" AS id FROM "spacecraft" WHERE "buildPlanId" = ANY($1::int[]) AND "userId" <> $2
       UNION SELECT "buildPlanId" FROM "colony_ship_build_queue" WHERE "buildPlanId" = ANY($1::int[]) AND "userId" <> $2
       UNION SELECT "buildplanId" FROM "trade_deals" WHERE "buildplanId" = ANY($1::int[])
       UNION SELECT "buildplanId" FROM "lottery_winner_buildplans" WHERE "buildplanId" = ANY($1::int[])`,
      [planIds, userId],
    );
    const keep = new Set(used.map((row) => Number(row.id)));
    const orphaned = planIds.filter((id) => keep.has(id));
    const removable = planIds.filter((id) => !keep.has(id));
    if (orphaned.length) await tx.update(ColonyShipBuildplan, { id: In(orphaned) }, { userId: null });
    if (removable.length) await tx.delete(ColonyShipBuildplan, { id: In(removable) });
  }
}
