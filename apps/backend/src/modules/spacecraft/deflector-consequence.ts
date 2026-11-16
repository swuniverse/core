import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { WsEventType } from '@swuniverse/shared';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService, type TransactionalNotifications } from '../messaging/messaging.service';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { GameGateway } from '../websocket/game.gateway';
import { CrewEnhancementEvent } from './crew-expertise';
import { CrewEnhancementService } from './crew-enhancement.service';
import { SpacecraftStatus, type Spacecraft } from './entities/spacecraft.entity';
import { STU_RANDOM_TOKEN, type StuRandom } from './field-effect-consequence';
import type {
  FlightConsequence,
  FlightConsequenceContext,
  FlightConsequenceField,
} from './flight-consequence-pipeline';
import { SpacecraftDamage } from './spacecraft-damage';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';

type SystemState = { active?: boolean; integrity?: number };

/**
 * STU `DeflectorConsequence` with `ApplyFieldDamage`: special damage of the
 * entered field type first, then the deflector costs `energyCost` EPS or the
 * ship takes the field type's damage in percent of its maximum hull.
 */
@Injectable()
export class DeflectorConsequence implements FlightConsequence {
  private readonly damage: SpacecraftDamage;

  constructor(
    private readonly dataSource: DataSource,
    private readonly messaging: MessagingService,
    private readonly gateway: GameGateway,
    private readonly destruction: SpacecraftDestructionService,
    private readonly crewEnhancement: CrewEnhancementService,
    @Inject(STU_RANDOM_TOKEN)
    random: StuRandom = Math.random,
  ) {
    this.damage = new SpacecraftDamage({
      integer: (min, max) => min + Math.floor(random() * (max - min + 1)),
    });
  }

  async onEnterField(
    ship: Spacecraft,
    field: FlightConsequenceField,
    messages: string[],
    transaction?: TransactionalNotifications,
    context?: FlightConsequenceContext,
  ): Promise<void> {
    // STU `skipWhenTractored`: the towing ship's flight covers the towed one.
    if (context?.towed) return;
    const type = field.fieldType ?? (await this.dataSource.getRepository(GalaxyFieldType).findOneBy({ id: field.fieldTypeId }));
    if (!type) return;
    const sector = 'cx' in field ? `${field.cx}|${field.cy}` : `${field.sx}|${field.sy}`;
    const lines: string[] = [];
    try {
      if (type.specialDamage > 0) {
        await this.applyFieldDamage(ship, type.specialDamage, true, `${type.name} in Sektor ${sector}`, type, sector, lines, transaction);
        if (ship.status === SpacecraftStatus.DESTROYED) return;
      }
      if (type.energyCost === 0 || context?.navicomputerJump) return;
      const deflector = (ship.runtimeSystems as Record<string, SystemState>).DEFLECTOR;
      if (!deflector || (deflector.integrity ?? 100) <= 0) {
        await this.applyFieldDamage(ship, type.damage, false, 'Deflektor außer Funktion.', type, sector, lines, transaction);
        return;
      }
      if (ship.energy >= type.energyCost) {
        ship.energy -= type.energyCost;
        return;
      }
      ship.energy = 0;
      await this.applyFieldDamage(ship, type.damage, false, 'Nicht genug Energie für den Deflektor.', type, sector, lines, transaction);
      const warped = (ship.runtimeSystems as Record<string, SystemState>).WARPDRIVE?.active === true;
      if (warped && ship.status !== SpacecraftStatus.DESTROYED) {
        await this.crewEnhancement.enhanceSpacecraft(
          ship.id,
          CrewEnhancementEvent.WARP_FLIGHT_WITHOUT_DEFLECTOR_ENERGY,
          transaction?.manager,
        );
      }
    } finally {
      messages.push(...lines);
      await this.notify(ship, lines, transaction);
    }
  }

  onTick(): void {
    // Field damage only applies on entry.
  }

  private async applyFieldDamage(
    ship: Spacecraft,
    amount: number,
    absolute: boolean,
    cause: string,
    type: GalaxyFieldType,
    sector: string,
    lines: string[],
    transaction?: TransactionalNotifications,
  ): Promise<void> {
    lines.push(`${cause}: Die ${ship.name} wurde in Sektor ${sector} beschädigt`);
    const netDamage = Math.ceil(absolute ? amount : (ship.hullMax * amount) / 100);
    const { destroyed } = this.damage.apply(ship, {
      netDamage,
      isCrit: false,
      hullDamageFactor: 100,
      shieldDamageFactor: 100,
      targetSystems: null,
    }, lines);
    if (!destroyed) return;
    const detail = `Die ${ship.name} wurde beim Einflug in Sektor ${sector} (${type.name}) zerstört`;
    const destroy = (manager: EntityManager, notifications?: TransactionalNotifications) =>
      this.destruction.destroyInManager(manager, ship.id, 'FIELD_DAMAGE', notifications, detail);
    if (transaction) {
      await destroy(transaction.manager, transaction);
    } else {
      await this.dataSource.transaction((manager) => destroy(manager));
    }
    ship.status = SpacecraftStatus.DESTROYED;
  }

  private async notify(ship: Spacecraft, lines: string[], transaction?: TransactionalNotifications): Promise<void> {
    if (!lines.length) return;
    const text = lines.join('\n');
    if (transaction) {
      await this.messaging.sendSystem(ship.userId, 'Feldschaden', text, undefined, MessageFolder.SHIP, undefined, false, transaction);
    } else {
      await this.messaging.sendSystem(ship.userId, 'Feldschaden', text, undefined, MessageFolder.SHIP);
    }
    const emit = () => this.gateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, {
      shipId: ship.id,
      type: 'FIELD_EFFECT',
      severity: 'WARNING',
      detail: lines[0],
    });
    if (transaction) transaction.afterCommit.push(emit);
    else emit();
  }
}
