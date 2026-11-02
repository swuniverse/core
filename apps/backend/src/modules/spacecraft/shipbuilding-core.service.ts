import { BadRequestException, Injectable } from '@nestjs/common';
import type { ShipModuleSelection } from '@swuniverse/shared';
import type { User } from '../auth/user.entity';
import { ColonyFabricationQueueType } from '../colony/entities/colony-fabrication-queue.entity';
import { GameDataService } from '../game-data/game-data.service';
import { ShipClassDef } from './entities/ship-class-def.entity';

export interface PreparedShipBuild {
  moduleSelections: ShipModuleSelection[];
  moduleCommodityIds: number[];
  moduleTypes: string[];
  materialCosts: Array<{ commodityId: number; amount: number }>;
  crewRequired: number;
}

@Injectable()
export class ShipbuildingCoreService {
  constructor(private readonly gameData: GameDataService) {}

  prepare(shipClass: ShipClassDef, selections: ShipModuleSelection[], faction: User['faction']): PreparedShipBuild {
    const layout = this.gameData.getShipClassSlotRuleForShipClass?.(shipClass)
      ?? this.gameData.getShipClassSlotRule(shipClass.category);
    if (!layout) throw new BadRequestException(`Missing ship layout for ${shipClass.category}`);
    const slots = new Map(layout.slots.map((slot) => [slot.slotId, slot]));
    const seen = new Set<string>();
    const normalized = (selections ?? []).map((selection) => {
      const slotId = String(selection?.slotId ?? '').trim();
      const commodityId = Number(selection?.commodityId);
      const slot = slots.get(slotId);
      if (!slot || !Number.isInteger(commodityId)) throw new BadRequestException('Invalid module selection');
      if (slot.moduleCategory !== 'SPECIAL' && seen.has(slot.moduleCategory)) throw new BadRequestException(`Duplicate module selection for ${slot.moduleCategory}`);
      const item = this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (!item || item.queueType !== ColonyFabricationQueueType.MODULE) throw new BadRequestException(`Commodity #${commodityId} is not a ship module`);
      if (item.faction != null && item.faction !== faction) throw new BadRequestException('Ship module is faction-locked');
      if ((item.shipyardType ?? 'UNKNOWN') !== slot.moduleCategory) throw new BadRequestException(`${item.displayName ?? `Module #${commodityId}`} does not fit ${slot.label}`);
      if (!this.gameData.isShipyardModuleAllowedForShipClass(item, shipClass)) throw new BadRequestException(`${item.displayName ?? `Module #${commodityId}`} is not allowed for ${shipClass.name}`);
      seen.add(slot.moduleCategory);
      return { slotId, commodityId };
    });
    const special = normalized.filter((selection) => slots.get(selection.slotId)?.moduleCategory === 'SPECIAL').length;
    if (special > (layout.moduleSlots.SPECIAL ?? 0)) throw new BadRequestException('More special modules selected than the hull allows');
    const crewRequired = shipClass.crewMin + normalized.reduce((sum, selection) => sum + (this.gameData.getFabricationItemByOutputCommodity(selection.commodityId)?.shipyardModuleStats?.crew ?? 0), 0);
    if (crewRequired > shipClass.crewMax) throw new BadRequestException(`Crew maximum exceeded: build requires ${crewRequired}, hull allows ${shipClass.crewMax}`);
    return {
      moduleSelections: normalized,
      moduleCommodityIds: normalized.map((x) => x.commodityId),
      moduleTypes: normalized.map((x) => slots.get(x.slotId)!.moduleCategory),
      materialCosts: (this.gameData.getShipClassDefByKey(shipClass.key)?.buildCosts ?? []).filter((x) => x.amount > 0),
      crewRequired,
    };
  }
}
