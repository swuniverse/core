import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { reactorFuelProfile } from './reactor-fuel-profile';
import { SpacecraftTorpedoService } from './spacecraft-torpedo.service';

/** The side that supplies a ship: a colony (orbit) or a station (docked ships). */
export interface ShipManagementSource {
  getEps(): number;
  lowerEps(amount: number): Promise<void>;
  /** Crew members that may go aboard a ship. */
  availableCrew(): Promise<number>;
  /** Free quarters for crew returning from a ship. */
  freeCrewQuarters(): Promise<number>;
  moveCrewToShip(shipId: number, amount: number): Promise<void>;
  moveCrewFromShip(shipId: number, amount: number): Promise<void>;
  getStock(commodityId: number): number;
  lowerStock(commodityId: number, amount: number): Promise<void>;
}

export interface ShipManagementRequest {
  shipId: number;
  targetCrew?: number;
  batteryCharge?: number;
  reactorLoad?: number;
  torpedoTypeId?: number;
  torpedoLoad?: number;
}

export interface ShipManagementResult {
  shipId: number;
  applied: string[];
  rejected: string[];
}

const whole = (value: number | undefined) => Math.max(0, Math.floor(value ?? 0));

/** Crew, battery, reactor and torpedo supply of ships, shared by colonies and stations. */
@Injectable()
export class ShipManagementService {
  constructor(
    private readonly gameData: GameDataService,
    private readonly torpedoService: SpacecraftTorpedoService,
  ) {}

  /**
   * Applies one request to a ship. `ship` must carry its `modules`.
   * `foreign` ships (not owned by the source) take no crew changes.
   */
  async manage(
    manager: EntityManager,
    source: ShipManagementSource,
    ship: Spacecraft,
    request: ShipManagementRequest,
    foreign = false,
  ): Promise<ShipManagementResult> {
    const applied: string[] = [];
    const rejected: string[] = [];
    const steps: Array<() => Promise<void>> = [
      () => this.growCrew(source, ship, request, foreign, applied),
      () => this.chargeBattery(source, ship, request, foreign, applied),
      () => this.loadReactor(source, ship, request, foreign, applied),
      () => this.shrinkCrew(source, ship, request, foreign, applied),
      () => this.loadTorpedoes(manager, source, ship, request, foreign, applied),
    ];
    for (const step of steps) {
      try {
        await step();
      } catch (error) {
        rejected.push(
          error instanceof Error ? error.message : 'Versorgung fehlgeschlagen',
        );
      }
    }
    await manager.save(ship);
    return { shipId: request.shipId, applied, rejected };
  }

  private async growCrew(
    source: ShipManagementSource,
    ship: Spacecraft,
    request: ShipManagementRequest,
    foreign: boolean,
    applied: string[],
  ) {
    if (foreign || request.targetCrew == null) return;
    const amount = Math.max(0, Math.floor(request.targetCrew) - ship.crew);
    if (!amount) return;
    if (
      (await source.availableCrew()) < amount ||
      ship.crew + amount > ship.crewMax
    ) {
      throw new BadRequestException(
        'Nicht genug freie Crew oder Schiffskapazität',
      );
    }
    await source.moveCrewToShip(ship.id, amount);
    ship.crew += amount;
    applied.push(`Crew: +${amount}`);
  }

  private async shrinkCrew(
    source: ShipManagementSource,
    ship: Spacecraft,
    request: ShipManagementRequest,
    foreign: boolean,
    applied: string[],
  ) {
    if (foreign || request.targetCrew == null) return;
    const amount = Math.max(0, ship.crew - Math.floor(request.targetCrew));
    if (!amount) return;
    if (ship.crew < amount) throw new BadRequestException('Nicht genug Crew an Bord');
    if ((await source.freeCrewQuarters()) < amount) {
      throw new BadRequestException('Kein Platz für die Crew');
    }
    await source.moveCrewFromShip(ship.id, amount);
    ship.crew -= amount;
    applied.push(`Crew: -${amount}`);
  }

  private async chargeBattery(
    source: ShipManagementSource,
    ship: Spacecraft,
    request: ShipManagementRequest,
    foreign: boolean,
    applied: string[],
  ) {
    const requested = whole(request.batteryCharge);
    if (!requested) return;
    this.assertUnshielded(ship, foreign, 'Batterie');
    const amount = Math.min(
      requested,
      source.getEps(),
      Math.max(0, ship.batteryMax - ship.battery),
    );
    if (!amount) {
      throw new BadRequestException(
        'Keine EPS oder Batteriekapazität verfügbar',
      );
    }
    await source.lowerEps(amount);
    ship.battery += amount;
    applied.push(`Batterie: +${amount}`);
  }

  private async loadReactor(
    source: ShipManagementSource,
    ship: Spacecraft,
    request: ShipManagementRequest,
    foreign: boolean,
    applied: string[],
  ) {
    const requested = whole(request.reactorLoad);
    if (!requested) return;
    this.assertUnshielded(ship, foreign, 'Reaktor');
    const profile = reactorFuelProfile(ship.modules ?? []);
    const capacityUnits = Math.floor(
      Math.max(0, ship.reactorFuelMax - ship.reactorFuel) / profile.loadUnits,
    );
    const stockUnits = Math.min(
      ...profile.costs.map((cost) =>
        Math.floor(source.getStock(cost.commodityId) / cost.amount),
      ),
    );
    const units = Math.min(
      Math.ceil(requested / profile.loadUnits),
      capacityUnits,
      stockUnits,
    );
    if (!units) {
      throw new BadRequestException('Nicht genug Reaktorkapazität oder Rohstoffe');
    }
    for (const cost of profile.costs) {
      await source.lowerStock(cost.commodityId, cost.amount * units);
    }
    const gained = units * profile.loadUnits;
    ship.reactorFuel += gained;
    applied.push(`Reaktor: +${gained}`);
  }

  private async loadTorpedoes(
    manager: EntityManager,
    source: ShipManagementSource,
    ship: Spacecraft,
    request: ShipManagementRequest,
    foreign: boolean,
    applied: string[],
  ) {
    const load = whole(request.torpedoLoad);
    if (!load) return;
    this.assertUnshielded(ship, foreign, 'Torpedos');
    const type = request.torpedoTypeId;
    if (!type) throw new BadRequestException('Torpedotyp fehlt');
    const torpedo = this.gameData.getTorpedoType(type);
    if (!torpedo) throw new BadRequestException('Unbekannter Torpedotyp');
    const repo = manager.getRepository(SpacecraftTorpedoStorage);
    let storage = await repo.findOneBy({ spacecraftId: ship.id });
    if (storage && storage.amount > 0 && storage.torpedoTypeId !== type) {
      throw new BadRequestException('Geladenen Torpedotyp zuerst entladen');
    }
    const capacity = await this.torpedoService.getCapacity(ship);
    if ((storage?.amount ?? 0) + load > capacity) {
      throw new BadRequestException('Nicht genug Torpedokapazität');
    }
    await source.lowerStock(torpedo.commodityId, load);
    storage ??= repo.create({
      spacecraftId: ship.id,
      torpedoTypeId: type,
      commodityId: torpedo.commodityId,
      amount: 0,
    });
    storage.torpedoTypeId = type;
    storage.commodityId = torpedo.commodityId;
    storage.amount += load;
    await repo.save(storage);
    applied.push(`Torpedos: +${load}`);
  }

  private assertUnshielded(ship: Spacecraft, foreign: boolean, what: string) {
    const shields = (
      ship.runtimeSystems as Record<string, { active?: boolean }> | undefined
    )?.SHIELDS;
    if (foreign && shields?.active === true) {
      throw new BadRequestException(
        `${what} konnte wegen aktivierter Schilde nicht geladen werden`,
      );
    }
  }
}
