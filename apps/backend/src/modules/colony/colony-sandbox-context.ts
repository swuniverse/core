import type { GameDataService } from '../game-data/game-data.service';
import type { ColonySandbox } from './entities/colony-sandbox.entity';
import type { Colony } from './entities/colony.entity';

/** In-memory adapter for shared rules/statistics; must never be persisted as a Colony. */
export function colonySandboxContext(
  sandbox: ColonySandbox,
  gameData: GameDataService,
): Colony {
  const snapshot = sandbox.snapshot;
  const colony = {
    ...snapshot,
    id: sandbox.sourceColonyId ?? -sandbox.id,
    userId: sandbox.userId,
    name: sandbox.name,
    celestialObject: snapshot.celestialObject ?? null,
    energy: snapshot.energy ?? 0,
    storageUsed: 0,
    storage: [],
    fields: snapshot.fields.map((field) => ({
      ...field,
      buildFinishesAt: field.buildFinishesAt
        ? new Date(field.buildFinishesAt)
        : null,
      terraformingFinishesAt: field.terraformingFinishesAt
        ? new Date(field.terraformingFinishesAt)
        : null,
    })),
    stats: { isBlockaded: false },
    changeable: {
      workers: snapshot.workers,
      workless: Math.max(0, snapshot.population - snapshot.workers),
      maxPopulation: snapshot.populationMax,
      maxEnergy: snapshot.energyMax,
      maxStorage: snapshot.storageMax,
      energy: snapshot.energy ?? 0,
      isBlockaded: false,
    },
  } as unknown as Colony;
  // Planning has no tick to update employment. Derive it from the current plan
  // before every activation so successive/mass builds cannot reuse workers.
  Object.defineProperties(colony.changeable, {
    workers: {
      enumerable: true,
      get: () =>
        colony.fields.reduce(
          (count, field) =>
            count +
            (field.isActive && !field.isBuilding && field.buildingId
              ? (gameData.getBuilding(field.buildingId)?.bevUse ?? 0)
              : 0),
          0,
        ),
    },
    workless: {
      enumerable: true,
      get: () => Math.max(0, snapshot.population - colony.changeable.workers),
    },
  });
  return colony;
}
