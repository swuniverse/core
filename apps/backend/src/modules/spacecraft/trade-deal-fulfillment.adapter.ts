import { BadRequestException, Injectable, type OnModuleInit } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { User } from '../auth/user.entity';
import { ColonyShipBuildplan } from '../colony/entities/colony-ship-buildplan.entity';
import { GameDataService } from '../game-data/game-data.service';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import type { TradeDealFulfillment } from '../trade/trade-deal-fulfillment.port';
import { TradeDealService } from '../trade/trade-deal.service';
import { AdminShipBuildplan } from './entities/admin-ship-buildplan.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { ShipbuildingCoreService } from './shipbuilding-core.service';
import { SpacecraftService } from './spacecraft.service';

/** STU `ShipCreator` loads EPS, reactor and warp drive to 25%. */
const DEAL_SHIP_LOAD = 0.25;

/** Delivers ships and buildplans of Hutt Cartel deals (tmw-T8a). */
@Injectable()
export class TradeDealFulfillmentAdapter implements TradeDealFulfillment, OnModuleInit {
  constructor(
    private readonly deals: TradeDealService,
    private readonly spacecraft: SpacecraftService,
    private readonly shipbuilding: ShipbuildingCoreService,
    private readonly gameData: GameDataService,
  ) {}

  onModuleInit(): void {
    this.deals.registerFulfillment(this);
  }

  async createShip(manager: EntityManager, input: { userId: number; buildplanId: number; locationId: number }): Promise<void> {
    const { plan, shipClass } = await this.plan(manager, input.buildplanId);
    const user = await manager.findOneByOrFail(User, { id: input.userId });
    const location = await manager.findOneByOrFail(SpaceLocation, { id: input.locationId });
    const { ship } = await this.spacecraft.createShipInManager(manager, {
      user,
      shipClass,
      modules: plan.moduleSelections,
      location,
      name: shipClass.name,
      preset: 'operational',
    });
    ship.energy = Math.floor(ship.energyMax * DEAL_SHIP_LOAD);
    ship.reactorFuel = Math.floor(ship.reactorFuelMax * DEAL_SHIP_LOAD);
    ship.warpdrive = Math.floor(ship.warpdriveMax * DEAL_SHIP_LOAD);
    await manager.save(Spacecraft, ship);
  }

  async grantBuildplan(manager: EntityManager, input: { userId: number; buildplanId: number }): Promise<void> {
    const { plan, shipClass } = await this.plan(manager, input.buildplanId);
    const signature = this.shipbuilding.signature(shipClass.id, plan.moduleSelections);
    if (await manager.existsBy(ColonyShipBuildplan, { userId: input.userId, signature })) {
      throw new BadRequestException('Du besitzt bereits einen Bauplan mit dieser Konfiguration');
    }
    let name = plan.name;
    for (let suffix = 2; await manager.existsBy(ColonyShipBuildplan, { userId: input.userId, name }); suffix++) {
      name = `${plan.name} (${suffix})`;
    }
    const commodityIds = plan.moduleSelections.map((selection) => selection.commodityId);
    await manager.save(
      ColonyShipBuildplan,
      manager.create(ColonyShipBuildplan, {
        userId: input.userId,
        shipClassId: shipClass.id,
        name,
        signature,
        moduleSelections: plan.moduleSelections,
        moduleCommodityIds: commodityIds,
        moduleTypes: commodityIds.flatMap((id) => {
          const type = this.gameData.getFabricationItemByOutputCommodity(id)?.moduleType;
          return type ? [type] : [];
        }),
      }),
    );
  }

  private async plan(manager: EntityManager, buildplanId: number) {
    const plan = await manager.findOneBy(AdminShipBuildplan, { id: buildplanId });
    const shipClass = plan ? await manager.findOneBy(ShipClassDef, { id: plan.shipClassId }) : null;
    if (!plan || !shipClass) throw new BadRequestException('Der Bauplan dieses Deals ist nicht mehr verfügbar');
    return { plan, shipClass };
  }
}
