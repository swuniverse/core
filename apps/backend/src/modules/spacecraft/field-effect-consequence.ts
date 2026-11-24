import { Inject, Injectable } from '@nestjs/common';
import { FieldEffect, knownFieldEffects, WsEventType } from '@swuniverse/shared';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService, type TransactionalNotifications } from '../messaging/messaging.service';
import { GameGateway } from '../websocket/game.gateway';
import type { Spacecraft } from './entities/spacecraft.entity';
import type { FlightConsequence, FlightConsequenceField } from './flight-consequence-pipeline';
import { recordSpacecraftShieldHit } from './spacecraft-damage';

export const STU_RANDOM_TOKEN = 'STU_RANDOM';
export const STU_CLOCK_TOKEN = 'STU_CLOCK';
export type StuRandom = () => number;
type SystemState = { active?: boolean; integrity?: number; current?: number; max?: number };

@Injectable()
export class FieldEffectConsequence implements FlightConsequence {
  constructor(
    private readonly messaging: MessagingService,
    private readonly gateway: GameGateway,
    @Inject(STU_RANDOM_TOKEN)
    private readonly random: StuRandom = Math.random,
    @Inject(STU_CLOCK_TOKEN)
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async onEnterField(ship: Spacecraft, field: FlightConsequenceField, messages: string[], transaction?: TransactionalNotifications): Promise<void> {
    const effects = this.effects(field);
    if (effects.has(FieldEffect.WARPDRIVE_LEAK)) {
      const loss = Math.min(ship.warpdrive, Math.ceil(ship.warpdriveMax / 10));
      ship.warpdrive -= loss;
      if (loss) messages.push(`Hyperantriebsleck: ${loss} Ladung verloren.`);
    }
    if (effects.has(FieldEffect.REACTOR_LEAK)) {
      const loss = this.leak(ship.reactorFuel, ship.reactorFuelMax);
      ship.reactorFuel -= loss;
      if (loss) messages.push(`Reaktorleck: ${loss} Reaktorladung verloren.`);
    }
    if (effects.has(FieldEffect.EPS_LEAK)) {
      const loss = this.leak(ship.energy, ship.epsMax || ship.energyMax);
      ship.energy -= loss;
      if (loss) messages.push(`EPS-Leck: ${loss} Energie verloren.`);
    }
    const systems = ship.runtimeSystems as Record<string, SystemState>;
    if (effects.has(FieldEffect.CLOAK_UNUSEABLE) && systems.CLOAK?.active) {
      systems.CLOAK.active = false;
      messages.push('Die Tarnvorrichtung wurde durch das Feld deaktiviert.');
    }
    if (effects.has(FieldEffect.NFS_MALFUNCTION_COOLDOWN) && systems.SHORT_RANGE_SENSORS) {
      const minutes = this.integer(10, 20);
      const proposed = new Date(this.clock().getTime() + minutes * 60_000);
      if (!ship.shortRangeSensorsCooldownUntil || proposed > ship.shortRangeSensorsCooldownUntil) {
        ship.shortRangeSensorsCooldownUntil = proposed;
        messages.push(`Nahbereichssensoren fallen für ${minutes} Minuten aus.`);
      }
    }
    await this.applyRecurring(ship, effects, messages);
    await this.notify(ship, messages, transaction);
  }

  async onTick(ship: Spacecraft, field: FlightConsequenceField): Promise<void> {
    const messages: string[] = [];
    await this.applyRecurring(ship, this.effects(field), messages);
    await this.notify(ship, messages);
  }

  private async applyRecurring(ship: Spacecraft, effects: Set<FieldEffect>, messages: string[]): Promise<void> {
    if (effects.has(FieldEffect.SHIELD_MALFUNCTION)) {
      const systems = ship.runtimeSystems as Record<string, SystemState>;
      if (systems.SHIELDS) systems.SHIELDS.active = false;
      const loss = this.leak(ship.shields, ship.shieldsMax);
      if (loss > 0) recordSpacecraftShieldHit(ship, this.clock().getTime());
      ship.shields -= loss;
      if (loss || systems.SHIELDS) messages.push(`Schildstörung: ${loss} Schildladung verloren.`);
    }
    if (effects.has(FieldEffect.REGENERATION_CHANCE) && this.random() < 0.2) {
      const candidates = this.regenerationCandidates(ship);
      if (candidates.length) {
        const candidate = candidates[Math.floor(this.random() * candidates.length)];
        const percent = this.integer(1, 20);
        const gain = Math.min(candidate.max - candidate.current(), Math.ceil(candidate.max * percent / 100));
        candidate.set(candidate.current() + gain);
        messages.push(`Energetische Regeneration: ${candidate.label} erhält ${gain} Ladung.`);
      }
    }
  }

  private regenerationCandidates(ship: Spacecraft) {
    const systems = ship.runtimeSystems as Record<string, SystemState>;
    return [
      systems.EPS === undefined ? null : { label: 'EPS', max: ship.epsMax || ship.energyMax, current: () => ship.energy, set: (v: number) => { ship.energy = v; } },
      systems.REACTOR === undefined ? null : { label: 'Reaktor', max: ship.reactorFuelMax, current: () => ship.reactorFuel, set: (v: number) => { ship.reactorFuel = v; } },
      systems.SHIELDS === undefined ? null : { label: 'Schilde', max: ship.shieldsMax, current: () => ship.shields, set: (v: number) => { ship.shields = v; } },
      systems.WARPDRIVE === undefined ? null : { label: 'Hyperantrieb', max: ship.warpdriveMax, current: () => ship.warpdrive, set: (v: number) => { ship.warpdrive = v; } },
    ].filter((item): item is NonNullable<typeof item> => Boolean(item && item.max > item.current() && (systems[item.label === 'EPS' ? 'EPS' : item.label === 'Reaktor' ? 'REACTOR' : item.label === 'Schilde' ? 'SHIELDS' : 'WARPDRIVE']?.integrity ?? 100) > 0));
  }

  private effects(field: FlightConsequenceField): Set<FieldEffect> {
    return new Set(knownFieldEffects([...(field.fieldType?.effects ?? []), ...(field.effects ?? [])]));
  }

  private leak(current: number, maximum: number): number {
    if (current <= 0 || maximum <= 0) return 0;
    return Math.min(current, this.integer(Math.ceil(maximum / 20), Math.ceil(maximum / 10)));
  }

  private integer(minimum: number, maximum: number): number {
    return minimum + Math.floor(this.random() * (maximum - minimum + 1));
  }

  private async notify(ship: Spacecraft, messages: string[], transaction?: TransactionalNotifications): Promise<void> {
    if (!messages.length) return;
    for (const detail of messages) {
      const positive = detail.startsWith('Energetische Regeneration');
      if (transaction) {
        await this.messaging.sendSystem(ship.userId, `${ship.name}: ${detail}`, undefined, MessageFolder.SHIP, undefined, false, transaction);
      } else {
        await this.messaging.sendSystem(ship.userId, `${ship.name}: ${detail}`, undefined, MessageFolder.SHIP);
      }
      const notify = () => this.gateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, { shipId: ship.id, type: 'FIELD_EFFECT', severity: positive ? 'SUCCESS' : 'WARNING', detail });
      if (transaction) transaction.afterCommit.push(notify);
      else notify();
    }
  }
}
